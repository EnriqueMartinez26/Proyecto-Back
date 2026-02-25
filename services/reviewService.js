const Review = require('../models/Review');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ErrorResponse = require('../utils/errorResponse');
const logger = require('../utils/logger');

class ReviewService {

  /**
   * Analiza el sentimiento de un texto usando OpenAI GPT-4o-mini.
   * Retorna null si OPENAI_API_KEY no está configurada (degradación).
   */
  async analyzeSentiment(text) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      logger.warn('[ReviewService] OPENAI_API_KEY no configurada, omitiendo análisis de sentimiento.');
      return null;
    }

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          temperature: 0.1,
          max_tokens: 150,
          messages: [
            {
              role: 'system',
              content: `Eres un analizador de sentimiento para reseñas de videojuegos en español.
Responde SOLO con un JSON válido con esta estructura exacta:
{
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "score": 0.0 a 1.0,
  "keywords": ["palabra1", "palabra2", "palabra3"]
}
- score: 1.0 = muy positivo, 0.5 = neutral, 0.0 = muy negativo
- keywords: 3 palabras clave que resuman el sentimiento (en español)
No incluyas texto adicional, solo el JSON.`
            },
            {
              role: 'user',
              content: text
            }
          ]
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        logger.error(`[ReviewService] OpenAI API error (${response.status}): ${errorData}`);
        return null;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) return null;

      const parsed = JSON.parse(content);

      // Validar estructura
      const validSentiments = ['positive', 'neutral', 'negative', 'mixed'];
      if (!validSentiments.includes(parsed.sentiment)) return null;

      return {
        sentiment: parsed.sentiment,
        sentimentScore: Math.max(0, Math.min(1, Number(parsed.score) || 0.5)),
        sentimentKeywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 5) : []
      };
    } catch (error) {
      logger.error('[ReviewService] Error en análisis de sentimiento:', error.message);
      return null;
    }
  }

  /**
   * Verifica si el usuario compró el producto (busca orders pagadas).
   */
  async isVerifiedPurchase(userId, productId) {
    const order = await Order.findOne({
      user: userId,
      isPaid: true,
      'orderItems.product': productId
    }).lean();
    return !!order;
  }

  /**
   * Crea una nueva reseña. Una por usuario por producto.
   */
  async createReview(userId, productId, { rating, title, text }) {
    // Verificar que el producto existe
    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new ErrorResponse('Producto no encontrado', 404);
    }

    // Verificar que no tenga ya una reseña
    const existing = await Review.findOne({ user: userId, product: productId }).lean();
    if (existing) {
      throw new ErrorResponse('Ya dejaste una reseña para este producto', 400);
    }

    // Verificar compra (para badge "Compra verificada")
    const verified = await this.isVerifiedPurchase(userId, productId);

    // Análisis de sentimiento (no bloquea si falla)
    const sentimentResult = await this.analyzeSentiment(text);

    const review = await Review.create({
      user: userId,
      product: productId,
      rating,
      title: title || '',
      text,
      verified,
      ...(sentimentResult && {
        sentiment: sentimentResult.sentiment,
        sentimentScore: sentimentResult.sentimentScore,
        sentimentKeywords: sentimentResult.sentimentKeywords
      })
    });

    // Recalcular calificación promedio del producto
    await this.updateProductRating(productId);

    // Populate para devolver datos completos
    const populated = await Review.findById(review._id)
      .populate('user', 'name avatar')
      .lean();

    return this.transformReview(populated);
  }

  /**
   * Obtiene las reseñas de un producto con paginación.
   */
  async getProductReviews(productId, { page = 1, limit = 10, sort = 'recent' } = {}) {
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let sortOption;
    switch (sort) {
      case 'helpful':
        sortOption = { helpfulCount: -1, createdAt: -1 };
        break;
      case 'highest':
        sortOption = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortOption = { rating: 1, createdAt: -1 };
        break;
      case 'recent':
      default:
        sortOption = { createdAt: -1 };
    }

    const [reviews, total] = await Promise.all([
      Review.find({ product: productId })
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .populate('user', 'name avatar')
        .lean(),
      Review.countDocuments({ product: productId })
    ]);

    return {
      reviews: reviews.map(r => this.transformReview(r)),
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Obtiene estadísticas de calificación de un producto.
   */
  async getProductRatingStats(productId) {
    const stats = await Review.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(productId) } },
      {
        $group: {
          _id: null,
          averageRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          rating5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          rating4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          rating3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          rating2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          rating1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
          sentimentPositive: { $sum: { $cond: [{ $eq: ['$sentiment', 'positive'] }, 1, 0] } },
          sentimentNeutral: { $sum: { $cond: [{ $eq: ['$sentiment', 'neutral'] }, 1, 0] } },
          sentimentNegative: { $sum: { $cond: [{ $eq: ['$sentiment', 'negative'] }, 1, 0] } },
          sentimentMixed: { $sum: { $cond: [{ $eq: ['$sentiment', 'mixed'] }, 1, 0] } }
        }
      }
    ]);

    if (!stats.length) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        sentiment: { positive: 0, neutral: 0, negative: 0, mixed: 0 }
      };
    }

    const s = stats[0];
    return {
      averageRating: Math.round(s.averageRating * 10) / 10,
      totalReviews: s.totalReviews,
      distribution: {
        5: s.rating5,
        4: s.rating4,
        3: s.rating3,
        2: s.rating2,
        1: s.rating1
      },
      sentiment: {
        positive: s.sentimentPositive,
        neutral: s.sentimentNeutral,
        negative: s.sentimentNegative,
        mixed: s.sentimentMixed
      }
    };
  }

  /**
   * Vota una reseña como útil. Un usuario solo puede votar una vez.
   */
  async voteHelpful(reviewId, userId) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new ErrorResponse('Reseña no encontrada', 404);
    }

    // El autor no puede votar su propia reseña
    if (review.user.toString() === userId.toString()) {
      throw new ErrorResponse('No podés votar tu propia reseña', 400);
    }

    const alreadyVoted = review.helpfulVoters.some(
      v => v.toString() === userId.toString()
    );

    if (alreadyVoted) {
      // Desvoto (toggle)
      review.helpfulVoters = review.helpfulVoters.filter(
        v => v.toString() !== userId.toString()
      );
      review.helpfulCount = Math.max(0, review.helpfulCount - 1);
    } else {
      review.helpfulVoters.push(userId);
      review.helpfulCount += 1;
    }

    await review.save();
    return { helpfulCount: review.helpfulCount, voted: !alreadyVoted };
  }

  /**
   * Elimina una reseña. Solo el autor o un admin pueden eliminar.
   */
  async deleteReview(reviewId, userId, isAdmin = false) {
    const review = await Review.findById(reviewId);
    if (!review) {
      throw new ErrorResponse('Reseña no encontrada', 404);
    }

    if (!isAdmin && review.user.toString() !== userId.toString()) {
      throw new ErrorResponse('No tenés permiso para eliminar esta reseña', 403);
    }

    const productId = review.product;
    await Review.findByIdAndDelete(reviewId);

    // Recalcular calificación promedio del producto
    await this.updateProductRating(productId);

    return { message: 'Reseña eliminada correctamente' };
  }

  /**
   * Recalcula la calificación promedio de un producto basándose en sus reseñas.
   */
  async updateProductRating(productId) {
    const stats = await Review.aggregate([
      { $match: { product: require('mongoose').Types.ObjectId.createFromHexString(productId.toString()) } },
      {
        $group: {
          _id: null,
          avg: { $avg: '$rating' },
          count: { $sum: 1 }
        }
      }
    ]);

    const avgRating = stats.length ? Math.round(stats[0].avg * 10) / 10 : 0;
    await Product.findByIdAndUpdate(productId, { calificacion: avgRating });
  }

  /**
   * Transforma un documento de Review lean a formato API.
   */
  transformReview(review) {
    return {
      id: review._id.toString(),
      user: {
        id: review.user?._id?.toString() || review.user?.toString(),
        name: review.user?.name || 'Usuario',
        avatar: review.user?.avatar || null
      },
      productId: review.product.toString(),
      rating: review.rating,
      title: review.title || '',
      text: review.text,
      sentiment: review.sentiment || null,
      sentimentScore: review.sentimentScore ?? null,
      sentimentKeywords: review.sentimentKeywords || [],
      verified: review.verified,
      helpfulCount: review.helpfulCount || 0,
      createdAt: review.createdAt
    };
  }
}

module.exports = new ReviewService();

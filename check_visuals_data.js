const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Platform = require('./models/Platform');
const Genre = require('./models/Genre');

const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });
console.log('Mongo URI:', process.env.MONGODB_URI ? 'Defined' : 'Undefined');

const checkData = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const platforms = await Platform.find({});
        console.log(`\nTotal Platforms: ${platforms.length}`);
        const multi = platforms.find(p => p.nombre === 'Multiplataforma' || p.id === 'multiplataforma');
        console.log('Multiplataforma found:', multi ? 'YES' : 'NO');
        if (multi) console.log(multi);

        const genres = await Genre.find({});
        console.log(`\nTotal Genres: ${genres.length}`);
        const sim = genres.find(g => g.nombre === 'Simulación' || g.id === 'simulacion' || g.nombre === 'Simulacion');
        console.log('Simulación found:', sim ? 'YES' : 'NO');
        if (sim) console.log(sim);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

checkData();

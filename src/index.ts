import express  from 'express';
import cors from 'cors';
import transferRoutes from './routes/transferRoutes';

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/v1', transferRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 REST API Fintech berjalan di http://localhost:${PORT}`)
})
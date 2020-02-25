import express from "express";
import { join } from "path";

const app = new express();
const root = join(process.argv[3], "public");
app.use(express.static(root));
app.listen(8000, () => console.log(`Document Root: ${root}\nHttp server running on port 8000...`));

import express from "express";
import mysql from "mysql2";
import bodyParser from "body-parser";
import axios from "axios";
import Buffer from "buffer";
import cors from "cors";
import { config } from "dotenv";
const app = express();
config({
  path: "./config.env",
});
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  authPlugins: {
    mysql_clear_password: () => () => Buffer.from(process.env.DB_PASSWORD),
  },
});
db.connect((err) => {
  if (err) {
    throw err;
  }
  console.log("Connected to MySQL database");
});
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.post("/submit", (req, res) => {
  const { username, codelang, stdin, sourcecode } = req.body;
  if (!username || !codelang || !sourcecode) {
    return res.status(400).json({ error: "Required fields cannot be empty" });
  }

  const submission = {
    username: username || "",
    codelang: codelang || "",
    stdin: stdin || "",
    sourcecode: sourcecode || "",
  };

  db.query("INSERT INTO submissions SET ?", submission, (err, result) => {
    if (err) {
      console.error(err);
      return res
        .status(500)
        .json({ error: "An error occurred while adding the submission" });
    }
    res.status(200).json({ message: "Submission added to database" });
  });
});
app.get("/page2", (req, res) => {
  db.query("SELECT * FROM submissions", (err, results) => {
    if (err) {
      throw err;
    }
    res.json({ submissions: results });
  });
});

app.post("/execute", async (req, res) => {
  try {
    const { sourcecode, codelang, stdin } = req.body;
    let lang;
    if (codelang === "C++") lang = "cpp";
    else if (codelang === "Java") lang = "java";
    else if (codelang === "Python") lang = "python3";
    else if (codelang === "JavaScript") lang = "javascript";
    const requestData = {
      src: sourcecode,
      stdin: stdin,
      lang: lang,
    };
    const response = await axios.post(
      "https://code-box.onrender.com/api/v1/submit",
      requestData
    );
    const output = response.data.data.output;
    const error = response.data.error;
    if (error) {
      res.json({ error });
    }
    res.status(200).json({ message: "Success", output });
  } catch (error) {
    console.log(error);
    res.send(error);
  }
});
app.delete("/submissions", (req, res) => {
  const query = "DELETE FROM submissions";
  db.query(query, (err, result) => {
    if (err) {
      res.status(500).json({
        status: "error",
        message: "An error occurred while deleting submissions",
      });
    } else {
      res.json({
        status: "success",
        message: "All submissions have been deleted",
      });
    }
  });
});
app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});


import express from "express";
import cors from "cors";
import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

const app = express();
app.use(cors());
app.use(express.json());

const adapter = new JSONFile("db.json");
const db = new Low(adapter, {
  users: [
    { id: "user1", name: "Malaika", email: "malaika@test.com" },
    { id: "user2", name: "Test User", email: "testuser@test.com" }
  ],
  documents: []
});

await db.read();
db.data ||= { users: [], documents: [] };
db.data.users ||= [];
db.data.documents ||= [];

if (db.data.users.length === 0) {
  db.data.users = [
    { id: "user1", name: "Malaika", email: "malaika@test.com" },
    { id: "user2", name: "Test User", email: "testuser@test.com" }
  ];
}
await db.write();

app.get("/api/users", (req, res) => {
  res.json(db.data.users);
});

app.get("/api/docs", (req, res) => {
  const userId = req.query.userId || "user1";
  const docs = db.data.documents.filter(doc =>
    doc.ownerId === userId || doc.sharedWith.includes(userId)
  );

  res.json(docs);
});

app.post("/api/docs", async (req, res) => {
  const { title, content = "", ownerId = "user1" } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: "Document title is required." });
  }

  const doc = {
    id: Date.now().toString(),
    title: title.trim(),
    content,
    ownerId,
    sharedWith: [],
    updated: new Date().toISOString()
  };

  db.data.documents.push(doc);
  await db.write();
  res.status(201).json(doc);
});

app.put("/api/docs/:id", async (req, res) => {
  const doc = db.data.documents.find(d => d.id === req.params.id);
  const userId = req.body.userId || "user1";

  if (!doc) return res.status(404).json({ error: "Document not found." });

  if (doc.ownerId !== userId && !doc.sharedWith.includes(userId)) {
    return res.status(403).json({ error: "Access denied." });
  }

  if (typeof req.body.title === "string") doc.title = req.body.title;
  if (typeof req.body.content === "string") doc.content = req.body.content;

  doc.updated = new Date().toISOString();
  await db.write();
  res.json(doc);
});

app.post("/api/docs/:id/share", async (req, res) => {
  const doc = db.data.documents.find(d => d.id === req.params.id);

  if (!doc) return res.status(404).json({ error: "Document not found." });

  if (doc.ownerId !== (req.body.ownerId || "user1")) {
    return res.status(403).json({ error: "Only the owner can share this document." });
  }

  const user = db.data.users.find(
    u => u.email.toLowerCase() === (req.body.email || "").trim().toLowerCase()
  );

  if (!user) return res.status(404).json({ error: "User email not found." });
  if (user.id === doc.ownerId) {
    return res.status(400).json({ error: "You already own this document." });
  }

  if (!doc.sharedWith.includes(user.id)) {
    doc.sharedWith.push(user.id);
  }

  await db.write();
  res.json({ message: "Document shared successfully.", document: doc });
});

app.delete("/api/docs/:id", async (req, res) => {
  const index = db.data.documents.findIndex(d => d.id === req.params.id);

  if (index === -1) return res.status(404).json({ error: "Document not found." });

  if (db.data.documents[index].ownerId !== (req.query.userId || "user1")) {
    return res.status(403).json({ error: "Only the owner can delete this document." });
  }

  db.data.documents.splice(index, 1);
  await db.write();
  res.json({ message: "Document deleted." });
});

app.listen(5000, () => {
  console.log("DocSpace backend running at http://localhost:5000");
});

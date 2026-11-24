
const API = "http://localhost:5000/api";

export async function getDocuments(userId = "user1") {
  const response = await fetch(`${API}/docs?userId=${userId}`);
  if (!response.ok) throw new Error("Could not load documents");
  return response.json();
}

export async function getUsers() {
  const response = await fetch(`${API}/users`);
  if (!response.ok) throw new Error("Could not load users");
  return response.json();
}

export async function createDocument(data) {
  const response = await fetch(`${API}/docs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Could not create document");
  return response.json();
}

export async function updateDocument(id, data) {
  const response = await fetch(`${API}/docs/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  if (!response.ok) throw new Error("Could not save document");
  return response.json();
}

export async function shareDocument(id, email) {
  const response = await fetch(`${API}/docs/${id}/share`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, ownerId: "user1" })
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Could not share document");
  return result;
}

export async function deleteDocument(id) {
  const response = await fetch(`${API}/docs/${id}?userId=user1`, {
    method: "DELETE"
  });
  if (!response.ok) throw new Error("Could not delete document");
  return response.json();
}

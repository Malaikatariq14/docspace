
import { describe, it, expect } from "vitest";

const API = "http://localhost:5000/api";

describe("DocSpace API", () => {
  it("should create and share a document", async () => {
    const createResponse = await fetch(`${API}/docs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Automated Test Document",
        content: "<p>Testing DocSpace</p>",
        ownerId: "user1"
      })
    });

    expect(createResponse.status).toBe(201);

    const doc = await createResponse.json();
    expect(doc.title).toBe("Automated Test Document");

    try {
      const shareResponse = await fetch(
        `${API}/docs/${doc.id}/share`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email: "testuser@test.com",
            ownerId: "user1"
          })
        }
      );

      expect(shareResponse.status).toBe(200);

      const userResponse = await fetch(
        `${API}/docs?userId=user2`
      );

      const userDocs = await userResponse.json();

      expect(
        userDocs.some(item => item.id === doc.id)
      ).toBe(true);

    } finally {
      await fetch(`${API}/docs/${doc.id}?userId=user1`, {
        method: "DELETE"
      });
    }
  });
});

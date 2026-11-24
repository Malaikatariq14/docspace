
import { useState, useRef, useEffect } from "react";
import {
  FileText, Plus, Search, Home, Share2, Clock3,
  Star, Trash2, Settings, Bell, MoreHorizontal,
  FilePlus2, FolderOpen, Sparkles, ChevronDown,
  LayoutGrid, List, ArrowUpRight, X, Save,
  Bold, Italic, Underline, Heading1, Heading2
} from "lucide-react";
import "./App.css";

import {
  getDocuments,
  createDocument as apiCreateDocument,
  updateDocument as apiUpdateDocument,
  shareDocument as apiShareDocument,
  deleteDocument as apiDeleteDocument
} from "./api";

function App() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId] = useState("user1");

  const [search, setSearch] = useState("");
  const [active, setActive] = useState("All Documents");
  const [view, setView] = useState("grid");
  const [notice, setNotice] = useState("");
  const [activeDoc, setActiveDoc] = useState(null);

  const editorRef = useRef(null);
  const contentRef = useRef("");

  function showNotice(message) {
    setNotice(message);
    setTimeout(() => setNotice(""), 2500);
  }

  async function loadDocs() {
    try {
      const data = await getDocuments(userId);

      setDocs(data.map(doc => ({
        ...doc,
        category: doc.ownerId === userId ? "My Document" : "Shared with me",
        color: "purple",
        updated: "Recently updated"
      })));
    } catch (error) {
      showNotice("Could not load documents from server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  useEffect(() => {
    if (activeDoc && editorRef.current) {
      const content = activeDoc.content || "";
      editorRef.current.innerHTML = content;
      contentRef.current = content;
      editorRef.current.focus();
    }
  }, [activeDoc?.id]);

  async function createDocument() {
    try {
      const newDoc = await apiCreateDocument({
        title: "Untitled Document",
        content: "",
        ownerId: userId
      });

      const formattedDoc = {
        ...newDoc,
        category: "My Document",
        color: "purple",
        updated: "Just now"
      };

      setDocs(prev => [formattedDoc, ...prev]);
      contentRef.current = "";
      setActiveDoc(formattedDoc);
      showNotice("New document created!");
    } catch (error) {
      showNotice("Could not create document.");
    }
  }

  function openDocument(doc) {
    contentRef.current = doc.content || "";
    setActiveDoc({ ...doc });
  }

  async function saveCurrentDocument() {
    if (!activeDoc) return;

    const content = editorRef.current
      ? editorRef.current.innerHTML
      : contentRef.current;

    try {
      const savedDoc = await apiUpdateDocument(activeDoc.id, {
        title: activeDoc.title,
        content,
        userId
      });

      setDocs(prev => prev.map(doc =>
        doc.id === savedDoc.id
          ? {
              ...doc,
              ...savedDoc,
              category: savedDoc.ownerId === userId
                ? "My Document"
                : "Shared with me",
              updated: "Just now"
            }
          : doc
      ));

      setActiveDoc(null);
      showNotice("Document saved successfully!");
    } catch (error) {
      showNotice("Could not save document.");
    }
  }

  function closeEditor() {
    saveCurrentDocument();
  }

  async function renameDocument(doc, e) {
    e.stopPropagation();

    const name = prompt("Rename document:", doc.title);

    if (!name || !name.trim()) return;

    try {
      const updated = await apiUpdateDocument(doc.id, {
        title: name.trim(),
        userId
      });

      setDocs(prev => prev.map(d =>
        d.id === doc.id ? { ...d, ...updated } : d
      ));

      showNotice("Document renamed!");
    } catch (error) {
      showNotice("Could not rename document.");
    }
  }

  async function deleteDocument(doc, e) {
    e.stopPropagation();

    if (doc.ownerId !== userId) {
      showNotice("Only the owner can delete this document.");
      return;
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete "${doc.title}"?`
    );

    if (!confirmDelete) return;

    try {
      await apiDeleteDocument(doc.id);

      setDocs(prev => prev.filter(d => d.id !== doc.id));

      if (activeDoc?.id === doc.id) {
        setActiveDoc(null);
      }

      showNotice("Document deleted successfully!");
    } catch (error) {
      showNotice("Could not delete document.");
    }
  }

  async function shareDocument(doc, e) {
    e.stopPropagation();

    if (doc.ownerId !== userId) {
      showNotice("Only the owner can share this document.");
      return;
    }

    const email = prompt(
      "Enter the email address of the person you want to share with:"
    );

    if (!email || !email.trim()) return;

    try {
      await apiShareDocument(doc.id, email.trim());
      await loadDocs();
      showNotice("Document shared successfully!");
    } catch (error) {
      showNotice(error.message || "Could not share document.");
    }
  }

  async function importFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();

      const escapedContent = text
        .split("\n")
        .map(line => {
          const safeLine = line
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

          return `<p>${safeLine || "<br>"}</p>`;
        })
        .join("");

      const newDoc = await apiCreateDocument({
        title: file.name.replace(/\.[^/.]+$/, ""),
        content: escapedContent,
        ownerId: userId
      });

      const formattedDoc = {
        ...newDoc,
        category: "Imported",
        color: "blue",
        updated: "Just now"
      };

      setDocs(prev => [formattedDoc, ...prev]);
      contentRef.current = escapedContent;
      setActiveDoc(formattedDoc);
      showNotice("File imported successfully!");
    } catch (error) {
      showNotice("Unable to import this file.");
    }

    e.target.value = "";
  }

  function formatText(command, value = null) {
    if (!editorRef.current) return;

    editorRef.current.focus();
    document.execCommand(command, false, value);

    contentRef.current = editorRef.current.innerHTML;
  }

  const visibleDocs = docs.filter(doc => {
    const matchesSearch = doc.title
      .toLowerCase()
      .includes(search.toLowerCase());

    const isOwned = doc.ownerId === userId;
    const isShared = doc.sharedWith?.includes(userId);

    const matchesTab =
      active === "All Documents" ||
      (active === "Recently Opened" && true) ||
      (active === "Starred" && doc.starred) ||
      (active === "Shared with me" && isShared) ||
      (active === "My Documents" && isOwned);

    return matchesSearch && matchesTab;
  });

  return (
    <div className="app-shell">

      {/* SIDEBAR */}
      <aside className="sidebar">

        <div className="brand">
          <div className="brand-icon">
            <FileText size={21} />
          </div>
          <span>
            doc<span className="brand-light">space</span>
          </span>
        </div>

        <button className="create-btn" onClick={createDocument}>
          <Plus size={19} /> Create new
        </button>

        <div className="nav-label">WORKSPACE</div>

        <nav className="nav-menu">

          <button
            className={active === "All Documents" ? "nav-item active" : "nav-item"}
            onClick={() => setActive("All Documents")}
          >
            <Home size={18} /> All Documents
          </button>

          <button
            className={active === "Recently Opened" ? "nav-item active" : "nav-item"}
            onClick={() => setActive("Recently Opened")}
          >
            <Clock3 size={18} /> Recently opened
          </button>

          <button
            className={active === "Starred" ? "nav-item active" : "nav-item"}
            onClick={() => setActive("Starred")}
          >
            <Star size={18} /> Starred
          </button>

          <button
            className={active === "Shared with me" ? "nav-item active" : "nav-item"}
            onClick={() => setActive("Shared with me")}
          >
            <Share2 size={18} /> Shared with me
          </button>

          <button
            className={active === "My Documents" ? "nav-item active" : "nav-item"}
            onClick={() => setActive("My Documents")}
          >
            <FolderOpen size={18} /> My documents
          </button>

          <button
            className="nav-item"
            onClick={() => showNotice("Trash is empty.")}
          >
            <Trash2 size={18} /> Trash
          </button>

        </nav>

        <div className="sidebar-bottom">

          <div className="storage-card">
            <div className="storage-icon">
              <Sparkles size={17} />
            </div>

            <strong>Your workspace</strong>
            <p>Your ideas, all in one place.</p>

            <div className="storage-bar">
              <span />
            </div>

            <small>{docs.length} documents created</small>
          </div>

          <button
            className="nav-item"
            onClick={() => showNotice("Settings coming soon.")}
          >
            <Settings size={18} /> Settings
          </button>

          <div className="profile">
            <div className="avatar">MT</div>

            <div>
              <strong>Malaika Tariq</strong>
              <small>Personal workspace</small>
            </div>

            <ChevronDown size={16} />
          </div>

        </div>
      </aside>

      {/* MAIN DASHBOARD */}
      <main className="main-content">

        <header className="topbar">

          <div className="breadcrumb">
            Workspace <span>/</span> Documents
          </div>

          <div className="top-actions">

            <div className="search-box">
              <Search size={17} />

              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search documents..."
              />

              <kbd>⌘ K</kbd>
            </div>

            <button
              className="icon-button"
              onClick={() => showNotice("You're all caught up!")}
            >
              <Bell size={19} />
              <i />
            </button>

            <div className="avatar top-avatar">MT</div>

          </div>
        </header>

        <section className="welcome-section">

          <div>
            <div className="eyebrow">
              <Sparkles size={14} /> YOUR CREATIVE WORKSPACE
            </div>

            <h1>
              Good afternoon, Malaika <span>✦</span>
            </h1>

            <p>
              Bring your ideas together. Create something amazing today.
            </p>
          </div>

          <button className="primary-btn" onClick={createDocument}>
            <Plus size={18} /> New document
          </button>

        </section>

        <section className="quick-actions">

          <button className="quick-card" onClick={createDocument}>
            <div className="quick-icon lavender">
              <FilePlus2 size={22} />
            </div>

            <div>
              <strong>Blank document</strong>
              <small>Start with a fresh page</small>
            </div>

            <ArrowUpRight size={17} className="quick-arrow" />
          </button>

          <button
            className="quick-card"
            onClick={() => document.getElementById("file-upload").click()}
          >
            <div className="quick-icon peach">
              <FolderOpen size={22} />
            </div>

            <div>
              <strong>Import a file</strong>
              <small>Bring your content in</small>
            </div>

            <ArrowUpRight size={17} className="quick-arrow" />
          </button>

          <input
            id="file-upload"
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            hidden
            onChange={importFile}
          />

        </section>

        {/* DOCUMENT LIST */}
        <section className="documents-section">

          <div className="section-heading">

            <div>
              <h2>Your documents</h2>
              <p>Everything you're working on, in one place.</p>
            </div>

            <div className="view-controls">

              <span>{loading ? "Loading..." : `${visibleDocs.length} documents`}</span>

              <button
                className={view === "grid" ? "view-btn selected" : "view-btn"}
                onClick={() => setView("grid")}
              >
                <LayoutGrid size={17} />
              </button>

              <button
                className={view === "list" ? "view-btn selected" : "view-btn"}
                onClick={() => setView("list")}
              >
                <List size={18} />
              </button>

            </div>
          </div>

          <div className="filter-tabs">

            {["All Documents", "Recently Opened", "Starred", "Shared with me", "My Documents"].map(tab => (
              <button
                key={tab}
                className={active === tab ? "filter-tab active-tab" : "filter-tab"}
                onClick={() => setActive(tab)}
              >
                {tab}
              </button>
            ))}

          </div>

          <div className={view === "grid" ? "document-grid" : "document-list"}>

            {visibleDocs.map(doc => (

              <article
                className="document-card"
                key={doc.id}
                onClick={() => openDocument(doc)}
                style={{ cursor: "pointer" }}
              >

                <div className={`document-preview ${doc.color || "purple"}`}>

                  <div className="preview-lines">
                    <div className="preview-title" />
                    <div />
                    <div />
                    <div className="short-line" />
                  </div>

                  <div className="doc-type">
                    <FileText size={15} /> DOC
                  </div>

                </div>

                <div className="document-info">

                  <div className="document-title-row">

                    <div>
                      <h3>{doc.title}</h3>
                      <p>
                        {doc.ownerId === userId ? "Owned by you" : "Shared with you"}
                        {" · "}
                        {doc.updated || "Recently updated"}
                      </p>
                    </div>

                    <div className="document-actions">

                      {doc.ownerId === userId && (
                        <button
                          className="more-btn"
                          onClick={e => shareDocument(doc, e)}
                          title="Share document"
                        >
                          <Share2 size={17} />
                        </button>
                      )}

                      {doc.ownerId === userId && (
                        <button
                          className="more-btn"
                          onClick={e => renameDocument(doc, e)}
                          title="Rename document"
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      )}

                      {doc.ownerId === userId && (
                        <button
                          className="more-btn delete-btn"
                          onClick={e => deleteDocument(doc, e)}
                          title="Delete document"
                        >
                          <Trash2 size={17} />
                        </button>
                      )}

                    </div>

                  </div>
                </div>

              </article>

            ))}

            {!loading && visibleDocs.length === 0 && (

              <div className="empty-state">
                <FileText size={32} />

                <h3>No documents found</h3>

                <p>
                  Try another search or create a new document.
                </p>

                <button className="primary-btn" onClick={createDocument}>
                  <Plus size={17} /> Create document
                </button>
              </div>

            )}

          </div>
        </section>

        <footer>
          Made for ideas that move work forward.
          <span>DocSpace © 2026</span>
        </footer>

      </main>

      {/* FULL SCREEN EDITOR */}
      {activeDoc && (

        <div
          className="editor-overlay"
          style={{
            position: "fixed",
            inset: 0,
            width: "100vw",
            height: "100vh",
            minHeight: "100dvh",
            zIndex: 99999,
            background: "#f8f7fb",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            overflowX: "hidden"
          }}
        >

          <header
            className="editor-header"
            style={{
              width: "100%",
              minHeight: "70px",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "12px 28px",
              boxSizing: "border-box",
              background: "#ffffff",
              borderBottom: "1px solid #e9e7ef"
            }}
          >

            <div className="editor-brand">
              <FileText size={23} />
              <span>DocSpace</span>
            </div>

            <div
              className="editor-header-actions"
              style={{
                display: "flex",
                gap: "12px",
                alignItems: "center"
              }}
            >

              <button className="primary-btn" onClick={saveCurrentDocument}>
                <Save size={17} /> Save & Close
              </button>

              <button
                className="view-btn"
                onClick={closeEditor}
                title="Close and save"
              >
                <X size={19} />
              </button>

            </div>
          </header>

          <div
            className="editor-document"
            style={{
              width: "min(900px, calc(100% - 40px))",
              margin: "35px auto",
              padding: "35px 45px",
              minHeight: "calc(100vh - 150px)",
              boxSizing: "border-box",
              background: "#ffffff",
              border: "1px solid #e9e7ef",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(30, 20, 60, 0.04)"
            }}
          >

            <input
              className="editor-title"
              value={activeDoc.title}
              onChange={e => setActiveDoc(prev => ({
                ...prev,
                title: e.target.value
              }))}
              placeholder="Untitled Document"
              style={{
                display: "block",
                width: "100%",
                border: "none",
                outline: "none",
                fontSize: "32px",
                fontWeight: "700",
                marginBottom: "25px",
                background: "transparent",
                color: "#24213a"
              }}
            />

            {/* FORMATTING TOOLBAR */}
            <div
              className="editor-toolbar"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: "8px",
                padding: "12px 0",
                marginBottom: "25px",
                borderTop: "1px solid #eeeaf3",
                borderBottom: "1px solid #eeeaf3"
              }}
            >

              <button
                type="button"
                title="Bold"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatText("bold")}
              >
                <Bold size={18} />
              </button>

              <button
                type="button"
                title="Italic"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatText("italic")}
              >
                <Italic size={18} />
              </button>

              <button
                type="button"
                title="Underline"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatText("underline")}
              >
                <Underline size={18} />
              </button>

              <span className="toolbar-divider" />

              <button
                type="button"
                title="Heading 1"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatText("formatBlock", "h1")}
              >
                <Heading1 size={19} />
              </button>

              <button
                type="button"
                title="Heading 2"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatText("formatBlock", "h2")}
              >
                <Heading2 size={19} />
              </button>

              <button
                type="button"
                title="Bullet list"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatText("insertUnorderedList")}
              >
                <List size={19} />
              </button>

              <button
                type="button"
                title="Numbered list"
                onMouseDown={e => e.preventDefault()}
                onClick={() => formatText("insertOrderedList")}
              >
                <List size={19} />
              </button>

            </div>

            {/* WRITING AREA */}
            <div
              className="editor-content"
              ref={editorRef}
              contentEditable={true}
              suppressContentEditableWarning={true}
              role="textbox"
              aria-label="Document writing area"
              aria-multiline="true"
              data-placeholder="Start writing your document here..."
              onInput={e => {
                contentRef.current = e.currentTarget.innerHTML;
              }}
              style={{
                display: "block",
                width: "100%",
                minHeight: "450px",
                padding: "10px 0",
                outline: "none",
                border: "none",
                background: "transparent",
                color: "#29263b",
                fontSize: "16px",
                lineHeight: "1.8",
                textAlign: "left",
                whiteSpace: "pre-wrap",
                overflowWrap: "break-word",
                cursor: "text"
              }}
            />

          </div>
        </div>
      )}

      {notice && (
        <div className="toast">
          <Sparkles size={16} /> {notice}
        </div>
      )}

    </div>
  );
}

export default App;

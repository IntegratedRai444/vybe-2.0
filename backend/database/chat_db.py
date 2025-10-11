"""
Chat History Database
SQLite database for persisting chat conversations
"""
import sqlite3
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import uuid

logger = logging.getLogger(__name__)


class ChatDatabase:
    """Manages chat history in SQLite database"""
    
    def __init__(self, db_path: str = "chat_history.db"):
        """
        Initialize chat database
        
        Args:
            db_path: Path to SQLite database file
        """
        self.db_path = db_path
        self._init_database()
    
    def _init_database(self):
        """Create database tables if they don't exist"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Sessions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                project_path TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT
            )
        """)
        
        # Messages table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                session_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                metadata TEXT,
                FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
            )
        """)
        
        # Create indexes
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_messages_session 
            ON messages(session_id)
        """)
        
        cursor.execute("""
            CREATE INDEX IF NOT EXISTS idx_sessions_updated 
            ON sessions(updated_at DESC)
        """)
        
        conn.commit()
        conn.close()
        logger.info(f"Chat database initialized at {self.db_path}")
    
    def create_session(
        self,
        name: str,
        project_path: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a new chat session
        
        Args:
            name: Session name
            project_path: Associated project path
            metadata: Additional metadata
            
        Returns:
            Session ID
        """
        session_id = str(uuid.uuid4())
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO sessions (id, name, project_path, metadata)
            VALUES (?, ?, ?, ?)
        """, (
            session_id,
            name,
            project_path,
            json.dumps(metadata) if metadata else None
        ))
        
        conn.commit()
        conn.close()
        
        logger.info(f"Created session {session_id}: {name}")
        return session_id
    
    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Add a message to a session
        
        Args:
            session_id: Session ID
            role: Message role (user, assistant, system)
            content: Message content
            metadata: Additional metadata
            
        Returns:
            Message ID
        """
        message_id = str(uuid.uuid4())
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Add message
        cursor.execute("""
            INSERT INTO messages (id, session_id, role, content, metadata)
            VALUES (?, ?, ?, ?, ?)
        """, (
            message_id,
            session_id,
            role,
            content,
            json.dumps(metadata) if metadata else None
        ))
        
        # Update session timestamp
        cursor.execute("""
            UPDATE sessions 
            SET updated_at = CURRENT_TIMESTAMP 
            WHERE id = ?
        """, (session_id,))
        
        conn.commit()
        conn.close()
        
        return message_id
    
    def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session details"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM sessions WHERE id = ?
        """, (session_id,))
        
        row = cursor.fetchone()
        conn.close()
        
        if row:
            return {
                "id": row["id"],
                "name": row["name"],
                "project_path": row["project_path"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else None
            }
        return None
    
    def get_messages(
        self,
        session_id: str,
        limit: Optional[int] = None,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        Get messages for a session
        
        Args:
            session_id: Session ID
            limit: Maximum number of messages
            offset: Offset for pagination
            
        Returns:
            List of messages
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        query = """
            SELECT * FROM messages 
            WHERE session_id = ? 
            ORDER BY timestamp ASC
        """
        
        if limit:
            query += f" LIMIT {limit} OFFSET {offset}"
        
        cursor.execute(query, (session_id,))
        rows = cursor.fetchall()
        conn.close()
        
        messages = []
        for row in rows:
            messages.append({
                "id": row["id"],
                "session_id": row["session_id"],
                "role": row["role"],
                "content": row["content"],
                "timestamp": row["timestamp"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else None
            })
        
        return messages
    
    def list_sessions(
        self,
        project_path: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """
        List chat sessions
        
        Args:
            project_path: Filter by project path
            limit: Maximum number of sessions
            offset: Offset for pagination
            
        Returns:
            List of sessions
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if project_path:
            cursor.execute("""
                SELECT s.*, COUNT(m.id) as message_count
                FROM sessions s
                LEFT JOIN messages m ON s.id = m.session_id
                WHERE s.project_path = ?
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT ? OFFSET ?
            """, (project_path, limit, offset))
        else:
            cursor.execute("""
                SELECT s.*, COUNT(m.id) as message_count
                FROM sessions s
                LEFT JOIN messages m ON s.id = m.session_id
                GROUP BY s.id
                ORDER BY s.updated_at DESC
                LIMIT ? OFFSET ?
            """, (limit, offset))
        
        rows = cursor.fetchall()
        conn.close()
        
        sessions = []
        for row in rows:
            sessions.append({
                "id": row["id"],
                "name": row["name"],
                "project_path": row["project_path"],
                "created_at": row["created_at"],
                "updated_at": row["updated_at"],
                "message_count": row["message_count"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else None
            })
        
        return sessions
    
    def update_session(
        self,
        session_id: str,
        name: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Update session details"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        updates = []
        params = []
        
        if name:
            updates.append("name = ?")
            params.append(name)
        
        if metadata is not None:
            updates.append("metadata = ?")
            params.append(json.dumps(metadata))
        
        if updates:
            updates.append("updated_at = CURRENT_TIMESTAMP")
            params.append(session_id)
            
            query = f"UPDATE sessions SET {', '.join(updates)} WHERE id = ?"
            cursor.execute(query, params)
            conn.commit()
        
        conn.close()
    
    def delete_session(self, session_id: str):
        """Delete a session and all its messages"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        conn.commit()
        conn.close()
        
        logger.info(f"Deleted session {session_id}")
    
    def delete_message(self, message_id: str):
        """Delete a specific message"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM messages WHERE id = ?", (message_id,))
        conn.commit()
        conn.close()
    
    def search_messages(
        self,
        query: str,
        session_id: Optional[str] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Search messages by content
        
        Args:
            query: Search query
            session_id: Optional session filter
            limit: Maximum results
            
        Returns:
            List of matching messages
        """
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        if session_id:
            cursor.execute("""
                SELECT * FROM messages 
                WHERE session_id = ? AND content LIKE ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (session_id, f"%{query}%", limit))
        else:
            cursor.execute("""
                SELECT * FROM messages 
                WHERE content LIKE ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (f"%{query}%", limit))
        
        rows = cursor.fetchall()
        conn.close()
        
        messages = []
        for row in rows:
            messages.append({
                "id": row["id"],
                "session_id": row["session_id"],
                "role": row["role"],
                "content": row["content"],
                "timestamp": row["timestamp"],
                "metadata": json.loads(row["metadata"]) if row["metadata"] else None
            })
        
        return messages
    
    def export_session(self, session_id: str, format: str = "json") -> str:
        """
        Export session to JSON or Markdown
        
        Args:
            session_id: Session ID
            format: Export format (json or markdown)
            
        Returns:
            Exported content as string
        """
        session = self.get_session(session_id)
        messages = self.get_messages(session_id)
        
        if format == "json":
            return json.dumps({
                "session": session,
                "messages": messages
            }, indent=2)
        
        elif format == "markdown":
            lines = [
                f"# {session['name']}",
                f"",
                f"**Created:** {session['created_at']}",
                f"**Updated:** {session['updated_at']}",
                f"",
                "---",
                ""
            ]
            
            for msg in messages:
                role_emoji = "👤" if msg["role"] == "user" else "🤖"
                lines.append(f"## {role_emoji} {msg['role'].title()}")
                lines.append(f"*{msg['timestamp']}*")
                lines.append("")
                lines.append(msg["content"])
                lines.append("")
                lines.append("---")
                lines.append("")
            
            return "\n".join(lines)
        
        else:
            raise ValueError(f"Unsupported format: {format}")
    
    def get_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute("SELECT COUNT(*) FROM sessions")
        total_sessions = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM messages")
        total_messages = cursor.fetchone()[0]
        
        cursor.execute("""
            SELECT COUNT(DISTINCT project_path) 
            FROM sessions 
            WHERE project_path IS NOT NULL
        """)
        total_projects = cursor.fetchone()[0]
        
        conn.close()
        
        return {
            "total_sessions": total_sessions,
            "total_messages": total_messages,
            "total_projects": total_projects,
            "database_path": self.db_path
        }


# Global database instance
_db = None


def get_chat_db() -> ChatDatabase:
    """Get or create global chat database instance"""
    global _db
    if _db is None:
        _db = ChatDatabase()
    return _db
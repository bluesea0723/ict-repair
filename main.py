from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# ==========================================
# 1. データベースの設定 (SQLAlchemy)
# ==========================================
# ※本番でPostgreSQLにする場合は 'postgresql://user:password@localhost/dbname' に変更
SQLALCHEMY_DATABASE_URL = "sqlite:///./repair_system.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# ==========================================
# 2. データベースのテーブル定義 (モデル)
# ==========================================
class RepairTicket(Base):
    __tablename__ = "repair_tickets"

    ticket_id = Column(Integer, primary_key=True, index=True) # 伝票ID
    student_id = Column(String(20), index=True)               # 学籍番号
    loaner_device = Column(String(50), nullable=True)         # 貸出機名
    damage_details = Column(Text, nullable=True)              # 症状
    status = Column(String(50), default="受付・状況確認中")      # ステータス

    # 返却チェックリスト（一部抜粋）
    chk_labels_attached = Column(Boolean, default=False)      # ラベル作成・貼付
    chk_restored = Column(Boolean, default=False)             # リストア
    chk_loaner_returned = Column(Boolean, default=False)      # 貸出機返却

# テーブルをデータベースに作成する
Base.metadata.create_all(bind=engine)

# ==========================================
# 3. データの受け渡しルール (Pydanticスキーマ)
# ==========================================
# フロントエンド（画面）から新しい伝票を登録する際に受け取るデータの形
class TicketCreate(BaseModel):
    student_id: str
    loaner_device: str | None = None
    damage_details: str | None = None

# ==========================================
# 4. APIエンドポイント (FastAPI)
# ==========================================
app = FastAPI(title="修理管理システムAPI")

# DBセッションを取得する関数
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ① 新しい修理伝票を登録するAPI
@app.post("/tickets/")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    # 受け取ったデータから新しいレコードを作成
    db_ticket = RepairTicket(
        student_id=ticket.student_id,
        loaner_device=ticket.loaner_device,
        damage_details=ticket.damage_details
        # statusやチェックリストはデフォルト値(Falseなど)が自動で入ります
    )
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return {"message": "伝票を登録しました", "ticket_id": db_ticket.ticket_id}

# ② すべての修理伝票のリストを取得するAPI
@app.get("/tickets/")
def read_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    tickets = db.query(RepairTicket).offset(skip).limit(limit).all()
    return tickets
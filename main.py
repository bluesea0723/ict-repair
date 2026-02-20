from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

# 1. データベース設定
SQLALCHEMY_DATABASE_URL = "sqlite:///./repair_system.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# 2. テーブル定義（項目を大幅に追加！）
class RepairTicket(Base):
    __tablename__ = "repair_tickets"

    ticket_id = Column(Integer, primary_key=True, index=True)
    # --- 新しく追加した項目 ---
    grade = Column(String(10), nullable=True)         # 学年
    class_num = Column(String(10), nullable=True)     # 組
    student_num = Column(String(10), nullable=True)   # 番号
    student_id = Column(String(20), index=True)       # 学籍番号
    name = Column(String(100), nullable=True)         # 氏名
    pc_serial = Column(String(50), nullable=True)     # PCシリアル
    kb_serial = Column(String(50), nullable=True)     # キーボードシリアル
    damage_category = Column(String(50), nullable=True) # 破損状況(分類)
    # --------------------------
    damage_details = Column(Text, nullable=True)      # 具体的な症状
    status = Column(String(50), default="学内受付")     # ステータス
    chk_restored = Column(Boolean, default=False)     # チェックリスト

Base.metadata.create_all(bind=engine)

# 3. データの受け渡しルール
class TicketCreate(BaseModel):
    grade: str | None = None
    class_num: str | None = None
    student_num: str | None = None
    student_id: str
    name: str | None = None
    pc_serial: str | None = None
    kb_serial: str | None = None
    damage_category: str | None = None
    damage_details: str | None = None
    status: str = "学内受付"

class TicketUpdate(BaseModel):
    status: str | None = None
    chk_restored: bool | None = None

# 4. APIエンドポイント
app = FastAPI(title="修理管理システムAPI")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.post("/tickets/")
def create_ticket(ticket: TicketCreate, db: Session = Depends(get_db)):
    # 受け取ったデータをまとめてデータベースに登録
    db_ticket = RepairTicket(**ticket.model_dump())
    db.add(db_ticket)
    db.commit()
    db.refresh(db_ticket)
    return {"message": "伝票を登録しました", "ticket": db_ticket}

@app.get("/tickets/")
def read_tickets(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(RepairTicket).offset(skip).limit(limit).all()

@app.patch("/tickets/{ticket_id}")
def update_ticket(ticket_id: int, update_data: TicketUpdate, db: Session = Depends(get_db)):
    db_ticket = db.query(RepairTicket).filter(RepairTicket.ticket_id == ticket_id).first()
    if not db_ticket:
        raise HTTPException(status_code=404, detail="指定された伝票が見つかりません")

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_ticket, key, value)

    db.commit()
    db.refresh(db_ticket)
    return {"message": "伝票を更新しました", "ticket": db_ticket}
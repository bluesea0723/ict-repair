from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, Boolean, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session

SQLALCHEMY_DATABASE_URL = "sqlite:///./repair_system.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class RepairTicket(Base):
    __tablename__ = "repair_tickets"

    ticket_id = Column(Integer, primary_key=True, index=True)
    grade = Column(String(10), nullable=True)
    class_num = Column(String(10), nullable=True)
    student_num = Column(String(10), nullable=True)
    student_id = Column(String(20), index=True)
    name = Column(String(100), nullable=True)
    
    # --- 追加：修理対象のチェックボックス ---
    repair_pc = Column(Boolean, default=False)
    repair_kb = Column(Boolean, default=False)
    repair_pen = Column(Boolean, default=False)
    
    pc_serial = Column(String(50), nullable=True)
    kb_serial = Column(String(50), nullable=True)
    damage_category = Column(String(50), nullable=True)
    damage_details = Column(Text, nullable=True)
    status = Column(String(50), default="学内受付")
    chk_restored = Column(Boolean, default=False)

Base.metadata.create_all(bind=engine)

class TicketCreate(BaseModel):
    grade: str
    class_num: str
    student_num: str
    student_id: str
    name: str
    repair_pc: bool
    repair_kb: bool
    repair_pen: bool
    pc_serial: str | None = None
    kb_serial: str | None = None
    damage_category: str
    damage_details: str
    status: str = "学内受付"

class TicketUpdate(BaseModel):
    status: str | None = None
    chk_restored: bool | None = None

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
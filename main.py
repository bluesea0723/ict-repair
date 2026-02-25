from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
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
    
    repair_pc = Column(Boolean, default=False)
    repair_kb = Column(Boolean, default=False)
    repair_pen = Column(Boolean, default=False)
    
    pc_serial = Column(String(50), nullable=True)
    kb_serial = Column(String(50), nullable=True)
    loaner_device = Column(String(50), nullable=True)
    
    # --- 追加：保護フィルム購入希望 ---
    needs_film = Column(Boolean, default=False)
    
    damage_category = Column(String(50), nullable=True)
    damage_details = Column(Text, nullable=True)
    memo = Column(Text, nullable=True)
    is_abnormal = Column(Boolean, default=False)

    status = Column(String(50), default="学内受付")
    
    chk_labels_attached = Column(Boolean, default=False)
    chk_screen_film = Column(Boolean, default=False)
    chk_data_deleted = Column(Boolean, default=False)
    chk_restored = Column(Boolean, default=False)
    chk_login_tested = Column(Boolean, default=False)
    chk_kb_label = Column(Boolean, default=False)
    chk_loaner_returned = Column(Boolean, default=False)

    time_chk_labels_attached = Column(String(50), nullable=True)
    time_chk_screen_film = Column(String(50), nullable=True)
    time_chk_data_deleted = Column(String(50), nullable=True)
    time_chk_restored = Column(String(50), nullable=True)
    time_chk_login_tested = Column(String(50), nullable=True)
    time_chk_kb_label = Column(String(50), nullable=True)
    time_chk_loaner_returned = Column(String(50), nullable=True)

    time_received = Column(String(50), nullable=True)
    time_waiting = Column(String(50), nullable=True)
    time_repairing = Column(String(50), nullable=True)
    time_preparing = Column(String(50), nullable=True)
    time_returnable = Column(String(50), nullable=True)
    time_completed = Column(String(50), nullable=True)

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
    loaner_device: str | None = None
    needs_film: bool = False  # ★追加
    damage_category: str
    damage_details: str
    memo: str | None = None
    is_abnormal: bool = False
    status: str = "学内受付"
    time_received: str | None = None 

class TicketUpdate(BaseModel):
    status: str | None = None
    memo: str | None = None
    is_abnormal: bool | None = None
    loaner_device: str | None = None
    needs_film: bool | None = None  # ★追加
    
    chk_labels_attached: bool | None = None
    chk_screen_film: bool | None = None
    chk_data_deleted: bool | None = None
    chk_restored: bool | None = None
    chk_login_tested: bool | None = None
    chk_kb_label: bool | None = None
    chk_loaner_returned: bool | None = None
    
    time_chk_labels_attached: str | None = None
    time_chk_screen_film: str | None = None
    time_chk_data_deleted: str | None = None
    time_chk_restored: str | None = None
    time_chk_login_tested: str | None = None
    time_chk_kb_label: str | None = None
    time_chk_loaner_returned: str | None = None

    time_received: str | None = None
    time_waiting: str | None = None
    time_repairing: str | None = None
    time_preparing: str | None = None
    time_returnable: str | None = None
    time_completed: str | None = None

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

app.mount("/", StaticFiles(directory=".", html=True), name="static")
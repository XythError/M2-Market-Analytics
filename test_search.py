from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import sessionmaker, declarative_base

Base = declarative_base()

class Item(Base):
    __tablename__ = 'items_test'
    id = Column(Integer, primary_key=True)
    name = Column(String)

engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)
session = Session()

session.add(Item(name="Dolunay Kılıcı+9"))
session.commit()

# Test exact
print("Testing 'Dolunay Kılıcı'...")
results = session.query(Item).filter(Item.name.contains("Dolunay Kılıcı")).all()
print(f"Found {len(results)} items.")

# Test lowercase
print("Testing 'dolunay kılıcı'...")
results = session.query(Item).filter(Item.name.contains("dolunay kılıcı")).all()
print(f"Found {len(results)} items.")

# Test mixed
print("Testing 'Dolunay'...")
results = session.query(Item).filter(Item.name.contains("Dolunay")).all()
print(f"Found {len(results)} items.")

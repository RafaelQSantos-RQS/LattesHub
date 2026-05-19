from fastapi import FastAPI

app = FastAPI(title="LattesHub API", version="1.0")

@app.get("/")
def root():
    return {"message": "LattesHub API e AI Worker operacionais!"}
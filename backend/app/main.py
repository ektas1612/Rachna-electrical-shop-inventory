from fastapi import FastAPI

app = FastAPI(title = "Electrical Shop API")

@app.get("/")
def root():
    return {"message": "Backend is alive ⚡"}
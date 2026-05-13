from fastapi import FastAPI

app = FastAPI(title="Medicine Ai Server")

@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service" : "ai-server"
    }
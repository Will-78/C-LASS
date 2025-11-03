from fastapi import FastAPI

app = FastAPI()

@app.get("/test")
def api_test():
    return {"message": "Backend working!"}

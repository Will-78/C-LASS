FROM python:3.10-slim
WORKDIR /app

COPY requirements.txt .

# Install requirements
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt pytest httpx

COPY . .

ENV PYTHONPATH=/app
# Define db here for now (if we scale up to PostgreSQL we can define it in .backend-env)
ENV DB_URL="sqlite:///test.db"

# To run tests inside the running container, use:
# docker exec -it backend pytest tests/
# Or to run them in a new container: docker-compose run --rm backend pytest tests/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

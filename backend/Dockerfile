FROM python:3.10-slim
WORKDIR /app

COPY requirements.txt .

# Install requirements
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt pytest httpx

COPY . .

ENV PYTHONPATH=/app
ENV DB_URL="sqlite:///temp.db"

# To run tests inside the running container, use:
# docker exec -it backend pytest tests/
# Or to run them in a new container: docker-compose run --rm backend pytest tests/

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"]

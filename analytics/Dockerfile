FROM python:3.11-slim

WORKDIR /analytics

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt jupyterlab

COPY . .

EXPOSE 8888

CMD ["jupyter", "lab", \
     "--ip=0.0.0.0", \
     "--port=8888", \
     "--no-browser", \
     "--allow-root", \
     "--ServerApp.token=", \
     "--ServerApp.password=", \
     "--notebook-dir=/analytics"]

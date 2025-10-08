# Quick Start
## 1. Environment Preparation

```bash
# Create a virtual environment from the project folder directory
python3.12 -m venv venv # use a version <=3.12
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows
```

## 2. Install Dependencies

### 2.1 Install required python packages
Install the requirements from the virtual environment, at the project folder directory
```bash
pip install -r requirements.txt
```

### 2.2 Install ffmpeg if using openAI's model for transcription
Install ffmpeg on system OS (not on virtual envornment)
```bash
brew install ffmpeg
```
### 2.3 Reinstate .env if using openAI's model for prediction
.env carries the OpenAI API key and is gitignored to protect the key.
Request the .env file from hj and then place it at the same directory as main.py.

## 3. Start the Streamlit App
```bash
# Start the dashboard
streamlit run main.py
```
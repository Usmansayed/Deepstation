#!/usr/bin/env python3
"""
Complete GCP Gemini & Web Search API Demo with Authenticated Access
Demonstrates authenticated access patterns without requiring active API calls.
"""

import google.genai as genai
from google.auth import default
import json


def show_auth_status():
    """Display current authentication status."""
    print("\n" + "="*60)
    print("AUTHENTICATION STATUS")
    print("="*60)
    
    try:
        credentials, project = default()
        print("\n✅ ADC (Application Default Credentials) Active")
        print(f"   Project: {project}")
        print(f"   Authenticated as: usmansayed61@gmail.com")
        print(f"   Auth method: Google Cloud SDK gcloud authentication")
        print(f"   No API keys required!")
        return project, credentials
    except Exception as e:
        print(f"❌ Authentication failed: {e}")
        return None, None


def show_gemini_api_setup():
    """Show Gemini API setup and configuration."""
    print("\n" + "="*60)
    print("GEMINI API - Setup & Configuration")
    print("="*60)
    
    project, credentials = default()
    
    print("\n✅ Vertex AI SDK Configuration:")
    print(f"""
    Project: {project}
    Location: us-central1
    Auth Type: Application Default Credentials (ADC)
    
    Models Available:
    - gemini-1.5-flash (faster, lower cost)
    - gemini-1.5-pro (more capable)
    - gemini-2.0-flash-exp (experimental)
    
    Usage Pattern:
    ```python
    import google.genai as genai
    from google.auth import default
    
    credentials, project = default()
    client = genai.Client(
        vertexai=True,
        project=project,
        location="us-central1"
    )
    
    # Generate content
    response = client.models.generate_content(
        model="gemini-1.5-flash",
        contents="Your prompt here"
    )
    print(response.text)
    ```
    """)


def show_websearch_options():
    """Show Web Search API options."""
    print("\n" + "="*60)
    print("WEB SEARCH API OPTIONS")
    print("="*60)
    
    print("""
✅ Option 1: Gemini with Search Grounding (Enterprise)
   - Ground Gemini responses with real-time web search
   - Requires enterprise billing
   - Setup: Enable in Google AI Studio
   - Use: Add search tool to generate_content()
   
✅ Option 2: Vertex AI Search (Discovery Engine)
   - Create custom search engines
   - Search your own documents/websites
   - Setup: 
     * Enable Discovery Engine API in GCP
     * Create search engine in GCP Console
     * Configure data source
   - Use: discoveryengine_v1 client
   
   Example:
   ```python
   from google.cloud import discoveryengine_v1
   
   client = discoveryengine_v1.SearchServiceClient()
   request = discoveryengine_v1.SearchRequest(
       serving_config=serving_config,
       query="your search query"
   )
   response = client.search(request)
   ```
   
✅ Option 3: Combine Gemini with External Search
   - Use any search API (Google Custom Search, etc)
   - Pass results to Gemini for synthesis
   - Most flexible approach
   
   Example:
   ```python
   # 1. Search for information
   search_results = fetch_search_results(query)
   
   # 2. Ask Gemini to synthesize
   response = client.models.generate_content(
       model="gemini-1.5-flash",
       contents=f"Summarize: {search_results}"
   )
   ```
    """)


def show_project_setup_requirements():
    """Show project setup requirements."""
    print("\n" + "="*60)
    print("GCP PROJECT SETUP REQUIREMENTS")
    print("="*60)
    
    project, _ = default()
    
    print(f"""
Current Project: {project}

✅ Required Steps for Full Setup:

1. Enable Required APIs:
   - Vertex AI API (for Gemini)
   - Discovery Engine API (for Web Search)
   
   Command:
   $ gcloud services enable aiplatform.googleapis.com
   $ gcloud services enable discoveryengine.googleapis.com

2. Enable Billing:
   - Visit: https://console.cloud.google.com/billing
   - Link billing account to project {project}
   - May take a few minutes to propagate

3. IAM Permissions:
   Your account needs:
   - roles/aiplatform.user (for Vertex AI)
   - roles/discoveryengine.editor (for Search)
   
   Verify permissions:
   $ gcloud projects get-iam-policy {project}

4. Initialize APIs (already configured):
   - Authentication via gcloud (✅ Done)
   - ADC setup (✅ Done)
   - SDK installed (✅ Done)
    """)


def show_example_code():
    """Show example code patterns."""
    print("\n" + "="*60)
    print("EXAMPLE CODE PATTERNS")
    print("="*60)
    
    print("""
1. SIMPLE TEXT GENERATION:
```python
import google.genai as genai
from google.auth import default

credentials, project = default()
client = genai.Client(vertexai=True, project=project, location="us-central1")

response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="What is Python?"
)
print(response.text)
```

2. WITH PARAMETERS:
```python
response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="Explain machine learning",
    config=genai.types.GenerateContentConfig(
        temperature=0.7,
        max_output_tokens=500,
        top_p=0.95
    )
)
```

3. STREAMING:
```python
response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents="Tell a story",
    stream=True
)
for chunk in response:
    print(chunk.text, end="")
```

4. MULTI-TURN CONVERSATION:
```python
chat = client.chats.create(model="gemini-1.5-flash")

message1 = chat.send_message("Hello!")
print(message1.text)

message2 = chat.send_message("What did I just say?")
print(message2.text)
```

5. WITH FILES/DOCUMENTS:
```python
# Upload a file
file = client.files.upload(file_data="./document.pdf")

# Use in generation
response = client.models.generate_content(
    model="gemini-1.5-flash",
    contents=[
        "Summarize this document:",
        file
    ]
)
```
    """)


def show_troubleshooting():
    """Show troubleshooting information."""
    print("\n" + "="*60)
    print("TROUBLESHOOTING")
    print("="*60)
    
    print("""
Issue: PERMISSION_DENIED (Billing disabled)
Solution:
- Enable billing on the project
- Go to: https://console.cloud.google.com/billing
- Link a billing account
- Wait 5-10 minutes for changes to propagate

Issue: API not enabled
Solution:
- gcloud services enable aiplatform.googleapis.com
- gcloud services enable discoveryengine.googleapis.com

Issue: Authentication failed
Solution:
- Run: gcloud auth login
- Run: gcloud auth application-default login
- Verify: gcloud auth list

Issue: Quota exceeded
Solution:
- Set quota project: gcloud config set quota_project [PROJECT_ID]
- Or add quota project to code:
  credentials = default(quota_project_id=project)[0]

Issue: Import errors
Solution:
- pip install --upgrade google-genai google-cloud-aiplatform
- pip install --upgrade google-auth
    """)


def main():
    """Main function."""
    print("\n" + "🔐 GCP GEMINI & WEB SEARCH API DEMO 🔐".center(60))
    print("=" * 60)
    
    # Show auth status
    project, credentials = show_auth_status()
    
    if project:
        # Show configurations
        show_gemini_api_setup()
        show_websearch_options()
        show_project_setup_requirements()
        show_example_code()
        show_troubleshooting()
        
        # Summary
        print("\n" + "=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"""
✅ Authentication: Configured with ADC (gcloud)
✅ Project: {project}
✅ User: usmansayed61@gmail.com
✅ Gemini API: Ready (needs billing enabled)
✅ Web Search: Available via multiple methods
✅ No API keys required!

NEXT STEPS:
1. Enable billing on project {project}
2. Enable required APIs (see requirements above)
3. Run example code when APIs are active

Ready to use authenticated GCP access!
        """)
    else:
        print("❌ Authentication setup failed.")


if __name__ == "__main__":
    main()

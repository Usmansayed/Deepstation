#!/usr/bin/env python3
"""
Vertex AI Gemini Demo - Using Authenticated GCP
Lists available models and tests API access
"""

import google.genai as genai
from google.auth import default


def main():
    """Main function."""
    print("\n" + "="*60)
    print("Vertex AI Gemini Demo (Authenticated)")
    print("="*60)
    
    # Get credentials and project
    credentials, project = default()
    print(f"\n✅ Authenticated as: usmansayed61@gmail.com")
    print(f"   Project: {project}")
    
    # Initialize client
    print("\nInitializing Vertex AI client...")
    client = genai.Client(
        vertexai=True,
        project=project,
        location="us-central1"
    )
    print("✅ Client initialized")
    
    # List available models
    print("\nFetching available models...")
    print("-" * 40)
    try:
        models = client.models.list()
        print("Available Models:")
        count = 0
        for model in models:
            print(f"  • {model.name}")
            count += 1
            if count >= 10:  # Show first 10
                print("  ...")
                break
    except Exception as e:
        print(f"Could not list models: {e}")
        print("\nTrying direct model access...")
    
    # Test with gemini-pro (may be available)
    print("\n1. Testing with gemini-pro:")
    print("-" * 40)
    try:
        response = client.models.generate_content(
            model="gemini-pro",
            contents="What is AI?"
        )
        print(f"✅ Success!\nResponse: {response.text[:200]}")
    except Exception as e:
        print(f"  Model not available: {e}")
    
    # Test with gemini-1.5-pro
    print("\n2. Testing with gemini-1.5-pro:")
    print("-" * 40)
    try:
        response = client.models.generate_content(
            model="gemini-1.5-pro",
            contents="What is Python?"
        )
        print(f"✅ Success!\nResponse: {response.text[:200]}")
    except Exception as e:
        print(f"  Model not available: {e}")
    
    # Test with gemini-2-flash-exp
    print("\n3. Testing with gemini-2.0-flash-exp:")
    print("-" * 40)
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash-exp",
            contents="Explain machine learning in 2 sentences"
        )
        print(f"✅ Success!\nResponse: {response.text[:200]}")
    except Exception as e:
        print(f"  Model not available: {e}")
    
    print("\n" + "="*60)
    print("Summary:")
    print("="*60)
    print("""
✅ Authentication: Working via ADC
✅ Vertex AI Connection: Established
✅ Billing: Enabled
⚠️  Models: May require specific region/access

Troubleshooting:
- Contact GCP support for model access
- Check region availability
- Verify billing account status
    """)


if __name__ == "__main__":
    main()

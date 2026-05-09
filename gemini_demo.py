#!/usr/bin/env python3
"""
Gemini API Demo - Using Google AI API (Free Tier)
No authentication setup needed - just works!
"""

import google.generativeai as genai


def main():
    """Main function."""
    print("\n" + "="*60)
    print("Gemini API Demo (Google AI)")
    print("="*60)
    
    # Configure the API - genai will use ADC or API key if available
    print("\nInitializing Gemini API...")
    
    # List available models
    print("\nAvailable Models:")
    print("-" * 40)
    try:
        models = genai.list_models()
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                print(f"  • {model.name}")
    except Exception as e:
        print(f"  Could not list models: {e}")
    
    # Test 1: Simple text generation
    print("\n1. Simple Text Generation:")
    print("-" * 40)
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("What is the capital of France?")
        print(f"Q: What is the capital of France?\nA: {response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 2: Another question
    print("\n2. Python Programming Question:")
    print("-" * 40)
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content("List 3 key benefits of Python programming in a bullet list")
        print(f"Q: List 3 key benefits of Python programming\nA:\n{response.text}")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 3: Multi-turn conversation
    print("\n3. Multi-turn Conversation:")
    print("-" * 40)
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        chat = model.start_chat(history=[])
        
        response1 = chat.send_message("What is machine learning?")
        print(f"Q: What is machine learning?\nA: {response1.text[:200]}...\n")
        
        response2 = chat.send_message("What are its applications?")
        print(f"Q: What are its applications?\nA: {response2.text[:200]}...")
    except Exception as e:
        print(f"Error: {e}")
    
    # Test 4: With streaming
    print("\n4. Streaming Response:")
    print("-" * 40)
    try:
        model = genai.GenerativeModel('gemini-1.5-flash')
        response = model.generate_content(
            "Tell a short 2-sentence story about a robot",
            stream=True
        )
        print("Streaming response:")
        for chunk in response:
            print(chunk.text, end="", flush=True)
        print("\n")
    except Exception as e:
        print(f"Error: {e}")
    
    print("=" * 60)
    print("✅ Demo Complete!")
    print("=" * 60)


if __name__ == "__main__":
    main()

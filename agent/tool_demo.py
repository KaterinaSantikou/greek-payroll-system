#!/usr/bin/env python3
"""
Demonstration of tool abstraction vs inline code.
Shows how the new tool system provides reusable, clean abstractions.
"""

from tools import (
    GitTool, BuildTool, TestTool, DatabaseTool, CodebaseTool,
    ToolResult, run_full_validation, commit_with_validation
)

def demo_tool_abstraction():
    """Demonstrate the power of tool abstraction"""
    print("🔧 Tool Abstraction Demo")
    print("=" * 50)
    
    # Example 1: TypeScript Check (before and after)
    print("\n📋 BEFORE: Inline subprocess code")
    print("""
    result = subprocess.run(
        ["npm", "run", "check"], 
        capture_output=True, 
        text=True, 
        timeout=120
    )
    if result.returncode == 0:
        print("✅ TypeScript compilation passed")
    else:
        print("❌ TypeScript compilation failed")
        print(f"Error: {result.stderr}")
    """)
    
    print("\n📋 AFTER: Clean tool abstraction")
    print("""
    result = BuildTool.typescript_check()
    if result.success:
        print(f"✅ {result.message}")
    else:
        print(f"❌ {result.message}")
        if result.error:
            print(f"Error: {result.error}")
    """)
    
    # Example 2: Git Operations
    print("\n📝 BEFORE: Manual git commands")
    print("""
    subprocess.run(["git", "add", "."], check=True)
    subprocess.run(["git", "commit", "-m", "message"], check=True)
    """)
    
    print("\n📝 AFTER: Tool with built-in validation")
    print("""
    result = commit_with_validation("message")
    if result.success:
        print(f"✅ {result.message}")
    else:
        print(f"❌ {result.message}")
    """)
    
    # Example 3: Full Validation
    print("\n🔒 BEFORE: 200+ lines of validation code")
    print("   [Complex inline validation logic with multiple subprocess calls]")
    
    print("\n🔒 AFTER: One function call")
    print("""
    validation_results = run_full_validation()
    all_passed = all(result.success for result in validation_results.values())
    """)
    
    print("\n✅ Benefits of Tool Abstraction:")
    print("   • Reusable across different parts of the agent")
    print("   • Consistent error handling and logging")
    print("   • Built-in secret masking and security")
    print("   • Standardized result objects")
    print("   • Easy to test and mock")
    print("   • Clean separation of concerns")

if __name__ == "__main__":
    demo_tool_abstraction()
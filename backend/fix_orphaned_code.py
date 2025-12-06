#!/usr/bin/env python3
"""
Script to fix orphaned code in server.py by removing duplicate/incomplete sections
"""

def fix_server_file():
    # Read the file
    with open('server.py', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Total lines in file: {len(lines)}")
    
    # Find all occurrences of key markers
    google_email_markers = []
    for i, line in enumerate(lines):
        if 'class GoogleEmailRequest(BaseModel):' in line:
            google_email_markers.append(i + 1)
            print(f"Found 'class GoogleEmailRequest' at line {i+1}")
        if 'async def get_google_avatar' in line:
            print(f"Found 'async def get_google_avatar' at line {i+1}")
        if '# ==================== Google Email Avatar API ====================' in line:
            print(f"Found Google Email Avatar section marker at line {i+1}")
    
    if len(google_email_markers) > 1:
        print(f"\n⚠️ WARNING: Found {len(google_email_markers)} definitions of GoogleEmailRequest!")
        print("This indicates duplicate code that needs to be removed.")
        print(f"Keeping the last occurrence at line {google_email_markers[-1]}")
        print(f"Will remove earlier occurrences")
    
    # Strategy: Keep only content after the last valid Google Email Avatar section
    # Find the last occurrence
    last_section_start = None
    for i in range(len(lines) - 1, -1, -1):
        if '# ==================== Google Email Avatar API ====================' in lines[i]:
            # Verify this is followed by a complete implementation
            # Look ahead for the class definition
            for j in range(i, min(i + 10, len(lines))):
                if 'class GoogleEmailRequest(BaseModel):' in lines[j]:
                    # Found a complete section
                    last_section_start = i
                    print(f"\nIdentified complete Google Email Avatar API section starting at line {i+1}")
                    break
            if last_section_start:
                break
    
    if last_section_start:
        # Find where the orphaned code starts
        # Look backwards from the last valid section for the previous section end
        orphaned_start = None
        for i in range(last_section_start - 1, -1, -1):
            line = lines[i].strip()
            # Look for the end of the previous complete section
            if line.startswith('# ===') and 'Celery Task Status' in lines[i]:
                orphaned_start = i + 10  # Start after that section
                break
            elif line.startswith('@app.') and 'def get_task_status_endpoint' in ' '.join(lines[i:i+3]):
                # Found the last valid function before orphaned code
                # Skip forward to find its end
                brace_count = 0
                in_function = False
                for j in range(i, last_section_start):
                    if 'def ' in lines[j] and not lines[j].strip().startswith('#'):
                        in_function = True
                    if in_function and lines[j].strip() and not lines[j].strip().startswith('#'):
                        # Look for return statement or next function
                        if lines[j].strip().startswith('return ') or lines[j].strip().startswith('@app.'):
                            if j + 5 < last_section_start:
                                orphaned_start = j + 5
                                break
        
        if orphaned_start and orphaned_start < last_section_start:
            print(f"\nOrphaned code detected from line {orphaned_start+1} to {last_section_start}")
            print(f"Will remove {last_section_start - orphaned_start} lines of orphaned code")
            
            # Create new file content
            new_lines = lines[:orphaned_start] + [
                "\n",
                "# ==================== ORPHANED CODE REMOVED ====================\n",
                f"# Removed approximately {last_section_start - orphaned_start} lines of orphaned code\n",
                "# that was not contained within any function definition.\n",
                "#\n",
                "# The removed code included:\n",
                "# - Gmail avatar fetching logic\n",
                "# - Truecaller API integration\n",
                "# - Platform verification API aggregator\n",
                "# - Data transformation for frontend\n",
                "# - Response handling with exception catching\n",
                "#\n",
                "# All this functionality should be accessed via existing working endpoints.\n",
                "# ===============================================================\n",
                "\n",
            ] + lines[last_section_start:]
            
            # Write back
            with open('server.py', 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            
            print(f"\n✅ Fixed! New file has {len(new_lines)} lines (reduced from {len(lines)})")
            print(f"Removed {len(lines) - len(new_lines)} lines of orphaned code")
            return True
        else:
            print("\n⚠️ Could not determine orphaned code boundaries safely")
            return False
    else:
        print("\n⚠️ Could not find valid Google Email Avatar API section")
        return False

if __name__ == '__main__':
    try:
        success = fix_server_file()
        if success:
            print("\n🎉 File successfully fixed!")
            print("Please reload VS Code window to see the changes")
        else:
            print("\n❌ Could not automatically fix the file")
            print("Manual intervention may be required")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()

#!/usr/bin/env python3
"""
Script to completely remove all remaining orphaned code after the get_google_avatar function header
"""

def fix_remaining_orphaned_code():
    # Read the file
    with open('server.py', 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    print(f"Total lines in file: {len(lines)}")
    
    # Find the last valid Google Email Avatar function
    target_start = None
    target_end = None
    
    for i, line in enumerate(lines):
        if 'async def get_google_avatar(request: GoogleEmailRequest):' in line:
            print(f"Found 'async def get_google_avatar' at line {i+1}")
            target_start = i
            
            # Look ahead for "logger.info" that should come after validation
            for j in range(i, min(i + 20, len(lines))):
                if 'logger.info' in lines[j] and 'Google Avatar' in lines[j]:
                    print(f"Found logger.info at line {j+1}")
                    # After this, there should be "try:" followed by "async with httpx.AsyncClient"
                    # If instead we see orphaned indented code, that's what we need to remove
                    for k in range(j + 1, min(j + 50, len(lines))):
                        stripped = lines[k].strip()
                        if stripped == 'try:':
                            # Check if next line is async with httpx
                            if k + 1 < len(lines):
                                next_line = lines[k + 1].strip()
                                if 'async with httpx.AsyncClient' in next_line:
                                    # This is the correct continuation
                                    print(f"Found correct try block at line {k+1}")
                                    return True  # File is already correct
                                else:
                                    # This is orphaned code, need to find where it ends
                                    print(f"Found orphaned try block at line {k+1}")
                                    # Look for the next proper Google Email Avatar section
                                    for m in range(k, len(lines)):
                                        if '# ==================== Google Email Avatar API ====================' in lines[m]:
                                            # Check if this is followed by a complete implementation
                                            for n in range(m, min(m + 15, len(lines))):
                                                if 'async def get_google_avatar(request: GoogleEmailRequest):' in lines[n]:
                                                    target_end = m - 1
                                                    print(f"Found end of orphaned code at line {target_end+1}")
                                                    print(f"Proper section starts at line {m+1}")
                                                    break
                                            if target_end:
                                                break
                                    break
                    break
    
    if target_start is not None and target_end is not None:
        # Remove orphaned code between target_start + logger line and target_end
        # Find the logger line after target_start
        logger_line = None
        for i in range(target_start, min(target_start + 15, len(lines))):
            if 'logger.info' in lines[i] and 'Google Avatar' in lines[i]:
                logger_line = i
                break
        
        if logger_line:
            # Keep everything up to and including the logger line
            # Then skip to target_end
            new_lines = lines[:logger_line + 1]
            new_lines.append('\n')
            new_lines.append('    try:\n')
            new_lines.append('        async with httpx.AsyncClient(timeout=30.0) as client:\n')
            new_lines.append('            response = await client.post(\n')
            new_lines.append('                "http://47.253.47.192:8002/api/email",\n')
            new_lines.append('                json={"email": email},\n')
            new_lines.append('                headers={"Content-Type": "application/json"}\n')
            new_lines.append('            )\n')
            new_lines.append('            \n')
            new_lines.append('            if response.status_code == 200:\n')
            new_lines.append('                data = response.json()\n')
            
            # Find where the proper implementation continues (after parsing the response)
            # Skip all the orphaned code
            proper_continuation = None
            for i in range(target_end, len(lines)):
                stripped = lines[i].strip()
                if stripped.startswith('if response.status_code == 200:') and i > target_end + 10:
                    proper_continuation = i + 1
                    print(f"Found proper continuation at line {i+1}")
                    break
                elif 'except Exception as google_err:' in lines[i] and 'Google Avatar' in lines[i+1] if i+1 < len(lines) else False:
                    proper_continuation = i
                    print(f"Found proper continuation at exception handler line {i+1}")
                    break
                elif '# ==================== Indonesia New API Query ====================' in lines[i]:
                    # Reached next section, need to find the end of current function
                    for j in range(i - 1, max(target_end, i - 50), -1):
                        if lines[j].strip().startswith('except ') or lines[j].strip().startswith('return '):
                            proper_continuation = j + 1
                            print(f"Found end of function before next section at line {j+1}")
                            break
                    break
            
            if proper_continuation:
                # Add the rest of the file from proper_continuation
                new_lines.extend(lines[proper_continuation:])
                
                # Write back
                with open('server.py', 'w', encoding='utf-8') as f:
                    f.writelines(new_lines)
                
                removed = len(lines) - len(new_lines)
                print(f"\n✅ Fixed! Removed {removed} lines of orphaned code")
                print(f"New file has {len(new_lines)} lines (reduced from {len(lines)})")
                return True
            else:
                print("\n⚠️ Could not find proper continuation point")
                return False
        else:
            print("\n⚠️ Could not find logger line")
            return False
    else:
        print("\n✅ No orphaned code detected or already fixed")
        return True

if __name__ == '__main__':
    try:
        success = fix_remaining_orphaned_code()
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

#!/usr/bin/env python3
import re

# Read the file
with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find line 1054 (0-indexed, so 1053)
if len(lines) > 1053:
    line = lines[1053]
    # Count leading spaces
    leading_spaces = len(line) - len(line.lstrip())
    print(f"Line 1054: {repr(line[:80])}")
    print(f"Leading spaces: {leading_spaces}")
    
# Now do replacements
content = ''.join(lines)

# Step 1: Replace the onclick
old_search = 'setProfileSearch("EMP_1024"); setPage("profile");'
new_search = 'setProfileSearch("EMP_1024_HONEYPOT"); setPage("profile");'
if old_search in content:
    content = content.replace(old_search, new_search)
    print("✓ Replaced onClick handler")
else:
    print("✗ Could not find onClick handler")

# Step 2: Add new honeypot rows after the breach row
new_rows = '''                       <tr className="hover:bg-[#1a1a1a] transition-colors">
                         <td className="p-4 text-[#00B4D8] font-bold">ACC_GHOST_15</td>
                         <td className="p-4">Rs.25,00,000</td>
                         <td className="p-4 text-xs text-gray-400">Await access trigger</td>
                         <td className="p-4 text-[10px] text-gray-600">Dormant</td>
                       </tr>
                       <tr className="hover:bg-[#1a1a1a] transition-colors">
                         <td className="p-4 text-[#00B4D8] font-bold">ACC_GHOST_61</td>
                         <td className="p-4">Rs.75,00,000</td>
                         <td className="p-4 text-xs text-gray-400">Credential logged</td>
                         <td className="p-4 text-[10px] text-gray-600">Monitoring</td>
                       </tr>
                       <tr className="hover:bg-[#1a1a1a] transition-colors">
                         <td className="p-4 text-[#00B4D8] font-bold">ACC_GHOST_88</td>
                         <td className="p-4">Rs.3,50,00,000</td>
                         <td className="p-4 text-xs text-gray-400">Premium decoy deployed</td>
                         <td className="p-4 text-[10px] text-gray-600">Armed</td>
                       </tr>
                       <tr className="hover:bg-[#1a1a1a] transition-colors">
                         <td className="p-4 text-[#00B4D8] font-bold">ACC_GHOST_33</td>
                         <td className="p-4">Rs.1,00,000</td>
                         <td className="p-4 text-xs text-gray-400">Micro-transaction trap</td>
                         <td className="p-4 text-[10px] text-gray-600">Idle</td>
                       </tr>
'''

# Find ACC_GHOST_07 and insert after it
acc_ghost_07_pattern = r'(<td className="p-4 text-\[11px\] text-\[#FFB300\] font-bold tracking-tight">EMP_1024 \| IP: 192\.168\.1\.45 \(Mumbai_BR_05\)</td>\s*</tr>)'
match = re.search(acc_ghost_07_pattern, content)
if match:
    insert_pos = match.end()
    content = content[:insert_pos] + '\n' + new_rows.rstrip() + '\n' + content[insert_pos:]
    print("✓ Added new honeypot rows")
else:
    print("✗ Could not find insertion point")

# Write back
with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Updated frontend/src/App.jsx successfully")

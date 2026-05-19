#!/usr/bin/env python3
import re

# Read the file
with open('frontend/src/App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add new honeypot rows after ACC_GHOST_07 breach row
new_rows = '''
                       <tr className="hover:bg-[#1a1a1a] transition-colors">
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
                       </tr>'''

# 2. Find and replace the breach detection row to call with _HONEYPOT flag
content = content.replace('setProfileSearch("EMP_1024"); setPage("profile");', 'setProfileSearch("EMP_1024_HONEYPOT"); setPage("profile");')

# 3. Insert new rows before </tbody>
# Find the closing tag of ACC_GHOST_07 row and insert before </tbody>
pattern = r'(<td className="p-4 text-\[11px\] text-\[#FFB300\] font-bold tracking-tight">EMP_1024 \| IP: 192\.168\.1\.45 \(Mumbai_BR_05\)</td>\s*</tr>)\s*(</tbody>)'
match = re.search(pattern, content)
if match:
    old_text = match.group(0)
    new_text = match.group(1) + new_rows + '\n                     ' + match.group(2)
    content = content[:match.start()] + new_text + content[match.end():]
    print('✓ Added new honeypot rows to table')
else:
    print('✗ Could not find insertion point for honeypot rows')

# Write back
with open('frontend/src/App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print('✓ Updated frontend/src/App.jsx')
print('✓ Honeypot table expanded to 7 rows')
print('✓ BREACH DETECTED now passes EMP_1024_HONEYPOT flag')

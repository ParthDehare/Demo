#!/usr/bin/env python3
# Simple string replacement for honeypot expansion

with open('d:\\DEmo\\frontend\\src\\App.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Replace the onclick to use _HONEYPOT flag
content = content.replace(
    'onClick={() => { setProfileSearch("EMP_1024"); setPage("profile"); }}',
    'onClick={() => { setProfileSearch("EMP_1024_HONEYPOT"); setPage("profile"); }}'
)

# Step 2: Add new honeypot rows
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

# Find the breach row and insert new rows after it
search_text = '''                       <tr className="hover:bg-[#1a1a1a] transition-colors bg-[#2a1313]">
                         <td className="p-4 text-[#E50914] font-bold">ACC_GHOST_07</td>
                         <td className="p-4">Rs.8,00,000</td>
                         <td className="p-4 text-xs text-[#E50914] font-bold animate-pulse">
                           BREACH DETECTED
                           <button 
                             onClick={() => { setProfileSearch("EMP_1024_HONEYPOT"); setPage("profile"); }}
                             className="ml-4 px-3 py-1 bg-[#E50914] text-white text-[10px] uppercase tracking-wider rounded font-bold hover:bg-red-700 transition cursor-pointer"
                           >
                             [ Investigate →  ]
                           </button>
                         </td>
                         <td className="p-4 text-[11px] text-[#FFB300] font-bold tracking-tight">EMP_1024 | IP: 192.168.1.45 (Mumbai_BR_05)</td>
                       </tr>'''

replacement_text = search_text + '\n' + new_rows

# Replace in content - use the version with setProfileSearch already updated
original_breach_row = '''                       <tr className="hover:bg-[#1a1a1a] transition-colors bg-[#2a1313]">
                         <td className="p-4 text-[#E50914] font-bold">ACC_GHOST_07</td>
                         <td className="p-4">Rs.8,00,000</td>
                         <td className="p-4 text-xs text-[#E50914] font-bold animate-pulse">
                           BREACH DETECTED
                           <button 
                             onClick={() => { setProfileSearch("EMP_1024_HONEYPOT"); setPage("profile"); }}
                             className="ml-4 px-3 py-1 bg-[#E50914] text-white text-[10px] uppercase tracking-wider rounded font-bold hover:bg-red-700 transition cursor-pointer"
                           >
                             [ Investigate →  ]
                           </button>
                         </td>
                         <td className="p-4 text-[11px] text-[#FFB300] font-bold tracking-tight">EMP_1024 | IP: 192.168.1.45 (Mumbai_BR_05)</td>
                       </tr>'''

if original_breach_row in content:
    content = content.replace(original_breach_row, original_breach_row + '\n' + new_rows)
    print("Successfully added new honeypot rows")
else:
    print("Warning: Could not find exact match for breach row, trying simpler approach...")
    # Try simpler search
    idx = content.find('ACC_GHOST_07')
    if idx > 0:
        # Find the </tr> after this row
        tr_end = content.find('</tr>', idx)
        if tr_end > 0:
            insert_pos = content.find('</tbody>', tr_end)
            if insert_pos > 0:
                content = content[:insert_pos] + new_rows + '\n                     ' + content[insert_pos:]
                print("Added new honeypot rows via simplified method")

with open('d:\\DEmo\\frontend\\src\\App.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Updated honeypot table expanded to 7 rows")
print("✓ BREACH DETECTED now uses EMP_1024_HONEYPOT identifier")

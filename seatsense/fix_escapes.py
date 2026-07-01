import sys

with open("src/content.ts", "r", encoding="utf-8") as f:
    content = f.read()

# Remove stray backslashes before backticks and dollar signs
content = content.replace("\\`", "`")
content = content.replace("\\${", "${")

with open("src/content.ts", "w", encoding="utf-8") as f:
    f.write(content)
print("Escapes fixed")

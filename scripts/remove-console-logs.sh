#!/bin/bash

#
# Console.log Removal Script
# Removes all console.log statements from production code
# Keeps console.error and console.warn
# Keeps test files untouched
#

echo "🧹 Removing console.log statements from production code..."

# Counter
count=0

# Find and remove console.log from server files (except tests)
for file in $(find server -name "*.ts" -not -path "*/node_modules/*" -not -path "*/__tests__/*" -not -path "*/tests/*"); do
  # Count occurrences
  file_count=$(grep -c "console\.log" "$file" 2>/dev/null || echo "0")

  if [ "$file_count" -gt 0 ]; then
    echo "  📄 $file ($file_count occurrences)"

    # Comment out console.log lines
    sed -i 's/^\(\s*\)console\.log(/\1\/\/ console.log(/g' "$file"

    count=$((count + file_count))
  fi
done

# Find and remove console.log from client files (except tests)
for file in $(find client/src -name "*.ts" -o -name "*.tsx" | grep -v node_modules | grep -v __tests__ | grep -v tests); do
  file_count=$(grep -c "console\.log" "$file" 2>/dev/null || echo "0")

  if [ "$file_count" -gt 0 ]; then
    echo "  📄 $file ($file_count occurrences)"

    # Comment out console.log lines
    sed -i 's/^\(\s*\)console\.log(/\1\/\/ console.log(/g' "$file"

    count=$((count + file_count))
  fi
done

echo ""
echo "✅ Commented out $count console.log statements"
echo ""
echo "⚠️  IMPORTANT: Review the changes with 'git diff' before committing"
echo "   Some console.logs might be intentional (delete those manually)"
echo ""
echo "To undo all changes: git checkout -- server/ client/src/"

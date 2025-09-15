#!/bin/bash

# Legal Release Tagging Script
# Creates git tags and releases for Greek payroll law changes
# Ensures proper version control and compliance tracking

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CHANGELOG_FILE="$PROJECT_ROOT/CHANGELOG.md"

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1" >&2
}

warn() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Print usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Create a legal compliance release for Greek payroll law changes.

OPTIONS:
    -v, --version VERSION     Release version (e.g., v2024.12.2)
    -t, --type TYPE          Change type (efka|tax|minimum-wage|severance|cba|other)
    -r, --reference REF      Legal reference (e.g., "Law 1234/2024")
    -d, --effective-date     Effective date (YYYY-MM-DD)
    -m, --message MESSAGE    Release message/description
    -f, --force             Skip confirmations and force creation
    -h, --help              Show this help message

EXAMPLES:
    # EFKA rate change
    $0 -v v2024.12.2 -t efka -r "EFKA Circular 456/2024" -d "2025-01-01" -m "Updated employer contribution rates"
    
    # Tax bracket adjustment  
    $0 -v v2024.11.1 -t tax -r "Law 5123/2024" -d "2024-11-01" -m "Reduced middle-income tax rates"
    
    # Minimum wage increase
    $0 -v v2024.10.1 -t minimum-wage -r "Ministerial Decision B.789/2024" -d "2024-10-01" -m "Minimum wage increase to €900"

EOF
}

# Validate version format
validate_version() {
    local version="$1"
    if [[ ! $version =~ ^v[0-9]{4}\.[0-9]{1,2}\.[0-9]+$ ]]; then
        error "Invalid version format. Use vYYYY.MM.PATCH (e.g., v2024.12.1)"
        return 1
    fi
}

# Validate change type
validate_change_type() {
    local type="$1"
    local valid_types=("efka" "tax" "minimum-wage" "severance" "cba" "other")
    
    for valid_type in "${valid_types[@]}"; do
        if [[ "$type" == "$valid_type" ]]; then
            return 0
        fi
    done
    
    error "Invalid change type: $type"
    error "Valid types: ${valid_types[*]}"
    return 1
}

# Validate date format
validate_date() {
    local date="$1"
    if ! date -d "$date" >/dev/null 2>&1; then
        error "Invalid date format: $date. Use YYYY-MM-DD"
        return 1
    fi
}

# Check if version already exists
check_version_exists() {
    local version="$1"
    if git tag -l | grep -q "^${version}$"; then
        error "Version $version already exists"
        return 1
    fi
}

# Validate git repository state
validate_git_state() {
    # Check if we're in a git repository
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        error "Not in a git repository"
        return 1
    fi
    
    # Check for uncommitted changes
    if ! git diff-index --quiet HEAD --; then
        warn "There are uncommitted changes in the working directory"
        if [[ "$FORCE" != "true" ]]; then
            echo "Commit or stash changes before creating a release, or use --force"
            return 1
        fi
    fi
    
    # Check current branch
    local current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" && "$current_branch" != "master" ]]; then
        warn "Not on main/master branch (current: $current_branch)"
        if [[ "$FORCE" != "true" ]]; then
            echo "Switch to main/master branch or use --force"
            return 1
        fi
    fi
}

# Update changelog
update_changelog() {
    local version="$1"
    local change_type="$2"
    local legal_ref="$3"
    local effective_date="$4" 
    local message="$5"
    
    log "Updating CHANGELOG.md"
    
    # Create changelog entry
    local entry="## [$version] - $(date +'%Y-%m-%d')

### Changed - $message
- **Legal Reference**: $legal_ref
- **Effective Date**: $effective_date
- **Impact**: [TODO: Specify impact on payroll calculations]

#### Technical Changes:
- [TODO: List specific code changes]
- [TODO: Updated constants/configuration]  
- [TODO: Modified calculation methods]
- [TODO: Test case updates]

---

"
    
    # Insert entry after [Unreleased] section
    if [[ -f "$CHANGELOG_FILE" ]]; then
        # Use temporary file for safe editing
        local temp_file=$(mktemp)
        
        # Find the line number after [Unreleased] section
        local insert_line=$(grep -n "^---$" "$CHANGELOG_FILE" | head -1 | cut -d: -f1)
        if [[ -n "$insert_line" ]]; then
            # Insert after the first --- marker
            head -n "$insert_line" "$CHANGELOG_FILE" > "$temp_file"
            echo "" >> "$temp_file"
            echo "$entry" >> "$temp_file"  
            tail -n +"$((insert_line + 1))" "$CHANGELOG_FILE" >> "$temp_file"
            
            mv "$temp_file" "$CHANGELOG_FILE"
            success "Updated CHANGELOG.md with release entry"
        else
            error "Could not find insertion point in CHANGELOG.md"
            return 1
        fi
    else
        error "CHANGELOG.md not found"
        return 1
    fi
}

# Create git tag
create_git_tag() {
    local version="$1"
    local change_type="$2"
    local legal_ref="$3"
    local effective_date="$4"
    local message="$5"
    
    log "Creating git tag: $version"
    
    # Create annotated tag with detailed message
    local tag_message="Legal Release $version

Change Type: $change_type
Legal Reference: $legal_ref
Effective Date: $effective_date
Description: $message

This release implements changes to Greek payroll calculations
based on official legal requirements. See CHANGELOG.md for
detailed technical changes and impact assessment."

    git tag -a "$version" -m "$tag_message"
    success "Created git tag: $version"
    
    # Show tag details
    log "Tag details:"
    git show "$version" --no-patch --format="  Commit: %H%n  Date: %ai%n  Author: %an <%ae>%n  Message: %s"
}

# Generate release summary
generate_release_summary() {
    local version="$1"
    local change_type="$2" 
    local legal_ref="$3"
    local effective_date="$4"
    local message="$5"
    
    cat << EOF

===============================================
LEGAL RELEASE SUMMARY
===============================================

Version:         $version
Change Type:     $change_type
Legal Reference: $legal_ref
Effective Date:  $effective_date
Description:     $message

Git Tag:         Created
Changelog:       Updated
Status:          Ready for deployment

NEXT STEPS:
1. Review CHANGELOG.md entry and add technical details
2. Update affected test cases and documentation  
3. Deploy to staging environment for validation
4. Push tag to remote repository: git push origin $version
5. Create GitHub/GitLab release with binaries if needed

COMPLIANCE NOTES:
- This release maintains full audit trail for legal compliance
- Version corresponds to specific Greek labor law changes
- All affected payroll calculations should be validated
- Consider notifying affected employees of changes

===============================================

EOF
}

# Confirmation prompt
confirm() {
    local message="$1"
    if [[ "$FORCE" == "true" ]]; then
        return 0
    fi
    
    echo -n -e "${YELLOW}$message (y/N):${NC} "
    read -r response
    case "$response" in
        [yY][eE][sS]|[yY])
            return 0
            ;;
        *)
            return 1
            ;;
    esac
}

# Main function
main() {
    local version=""
    local change_type=""
    local legal_ref=""
    local effective_date=""
    local message=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--version)
                version="$2"
                shift 2
                ;;
            -t|--type)
                change_type="$2"
                shift 2
                ;;
            -r|--reference)
                legal_ref="$2"
                shift 2
                ;;
            -d|--effective-date)
                effective_date="$2"
                shift 2
                ;;
            -m|--message)
                message="$2"
                shift 2
                ;;
            -f|--force)
                FORCE="true"
                shift
                ;;
            -h|--help)
                usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
        esac
    done
    
    # Validate required arguments
    if [[ -z "$version" || -z "$change_type" || -z "$legal_ref" || -z "$effective_date" || -z "$message" ]]; then
        error "Missing required arguments"
        usage
        exit 1
    fi
    
    # Validate inputs
    validate_version "$version" || exit 1
    validate_change_type "$change_type" || exit 1
    validate_date "$effective_date" || exit 1
    
    # Validate git state
    validate_git_state || exit 1
    
    # Check if version already exists
    check_version_exists "$version" || exit 1
    
    # Show summary and confirm
    cat << EOF

Creating legal release with the following details:
  Version:         $version
  Change Type:     $change_type
  Legal Reference: $legal_ref
  Effective Date:  $effective_date
  Description:     $message

EOF
    
    if ! confirm "Proceed with legal release creation?"; then
        log "Release creation cancelled"
        exit 0
    fi
    
    # Create the release
    log "Starting legal release creation process..."
    
    # Update changelog
    update_changelog "$version" "$change_type" "$legal_ref" "$effective_date" "$message"
    
    # Commit changelog changes
    git add "$CHANGELOG_FILE"
    git commit -m "docs: Update CHANGELOG for legal release $version

$legal_ref - $message
Effective: $effective_date"
    
    # Create git tag
    create_git_tag "$version" "$change_type" "$legal_ref" "$effective_date" "$message"
    
    # Generate summary
    generate_release_summary "$version" "$change_type" "$legal_ref" "$effective_date" "$message"
    
    success "Legal release $version created successfully!"
    
    # Remind about pushing
    echo ""
    warn "Don't forget to push the tag to remote repository:"
    echo "  git push origin $version"
    echo "  git push origin main  # (or master)"
}

# Run main function
main "$@"
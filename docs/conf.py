# Configuration file for the Sphinx documentation builder.
#
# For the full list of built-in configuration values, see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Project information -----------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#project-information

project = 'University Inventory Management System'
copyright = '2025, University IT Department'
author = 'University IT Department'
version = '1.0.0'
release = '1.0.0'

# -- General configuration ---------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#general-configuration

extensions = [
    'sphinx.ext.autodoc',
    'sphinx.ext.viewcode',
    'sphinx.ext.napoleon',
    'sphinx.ext.intersphinx',
    'sphinxcontrib.httpdomain',
    'myst_parser',
    'sphinxcontrib.mermaid',
]

templates_path = ['_templates']
exclude_patterns = ['_build', 'Thumbs.db', '.DS_Store']

# -- Options for HTML output -------------------------------------------------
# https://www.sphinx-doc.org/en/master/usage/configuration.html#options-for-html-output

html_theme = 'sphinx_rtd_theme'
html_static_path = ['_static']

# -- Extension configuration -------------------------------------------------

# MyST Parser configuration
myst_enable_extensions = [
    "deflist",
    "tasklist",
    "colon_fence",
    "substitution",
    "html_admonition",
]

# Mermaid configuration
mermaid_output_format = 'svg'
mermaid_init_js = """
mermaid.initialize({
    startOnLoad: true,
    theme: 'default',
    themeVariables: {
        primaryColor: '#1976D2',
        primaryTextColor: '#fff',
        primaryBorderColor: '#1565C0',
        lineColor: '#757575',
        sectionBkgColor: '#E3F2FD',
        altSectionBkgColor: '#BBDEFB',
        gridColor: '#E0E0E0',
        secondaryColor: '#F3E5F5',
        tertiaryColor: '#E8F5E8'
    },
    flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
    },
    sequence: {
        useMaxWidth: true,
        diagramMarginX: 10,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35
    },
    er: {
        diagramPadding: 20,
        layoutDirection: 'TB',
        minEntityWidth: 100,
        minEntityHeight: 75,
        entityPadding: 15,
        stroke: 'gray',
        fill: 'honeydew',
        fontSize: 12
    }
});
"""

# Napoleon settings
napoleon_google_docstring = True
napoleon_numpy_docstring = True
napoleon_include_init_with_doc = False
napoleon_include_private_with_doc = False

# Intersphinx mapping
intersphinx_mapping = {
    'python': ('https://docs.python.org/3/', None),
    'nodejs': ('https://nodejs.org/api/', None),
}

# HTML theme options
html_theme_options = {
    'logo_only': False,
    'display_version': True,
    'prev_next_buttons_location': 'bottom',
    'style_external_links': False,
    'vcs_pageview_mode': '',
    'style_nav_header_background': '#1976D2',
    # Toc options
    'collapse_navigation': True,
    'sticky_navigation': True,
    'navigation_depth': 4,
    'includehidden': True,
    'titles_only': False
}

# Add custom CSS
html_css_files = [
    'custom.css',
]

# HTML context
html_context = {
    "display_github": False,
    "last_updated": True,
    "commit": False,
}

# HTML title
html_title = f"{project} Documentation"
html_short_title = "Inventory Docs"

# HTML favicon
html_favicon = None

# HTML logo
html_logo = None

# Add source file suffix
source_suffix = {
    '.rst': None,
    '.md': None,
}

# Master document
master_doc = 'index'

# Language
language = 'en'

# LaTeX output
latex_elements = {
    'papersize': 'letterpaper',
    'pointsize': '10pt',
    'preamble': '',
    'figure_align': 'htbp',
}

# Grouping the document tree into LaTeX files
latex_documents = [
    (master_doc, 'UniversityInventory.tex', 'University Inventory Management System Documentation',
     'University IT Department', 'manual'),
]

# EPUB options
epub_title = project
epub_exclude_files = ['search.html']
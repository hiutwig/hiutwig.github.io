from flask import Flask, request, redirect, url_for, send_from_directory, render_template_string, abort, render_template
import os

app = Flask(__name__)

# Dictionary for project passwords
PROJECT_PASSWORDS = {
    "clara": "password123",
    # Add more projects and passwords here
}

# Route to serve the root static files
@app.route('/')
def home():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static_files(filename):
    return send_from_directory('.', filename)

# Works index page
@app.route('/works/')
def works_index():
    return send_from_directory('works', 'index.html')

# Password-protected project page
@app.route('/works/<project>/', methods=['GET', 'POST'])
def protect_project(project):
    project_index_path = os.path.join('works', project, 'index.html')

    # Check if project exists
    if not os.path.exists(project_index_path):
        abort(404, description="Project not found")

    # Handle password submission
    if request.method == 'POST':
        entered_password = request.form['password']
        if PROJECT_PASSWORDS.get(project) == entered_password:
            return send_from_directory(f'works/{project}', 'index.html')
        else:
            error_message = "Incorrect password. Please try again."
            return render_template('password.html', project=project, error_message=error_message)

    # Render password screen
    return render_template('password.html', project=project)

# Allow non-HTML files in project directories (e.g., images)
@app.route('/works/<project>/<path:filename>')
def serve_project_assets(project, filename):
    # Block access to index.html directly
    if filename == "index.html":
        abort(403, description="Direct access to project files is not allowed.")
    return send_from_directory(f'works/{project}', filename)

if __name__ == '__main__':
    app.run(debug=True)
<nav class="navbar navbar-default" role="navigation">
	<div class="container-fluid">
		<ul class="nav navbar-nav">
			<li><a href="/">Home</a></li>
			<li><a href="/users">Users</a></li>
		</ul>
		{% if session.user.id %}
		<ul class="nav navbar-nav navbar-right">
			<li><a href="/logout">Logout</a></li>
		</ul>
		<p class="navbar-text navbar-right">Welcome back, <a href="/users/{{ session.user.username }}">{{ session.user.profile_username }}</a></p>
		{% else %}
		<ul class="nav navbar-nav navbar-right">
			<li><a href="/register">Register</a></li>
			<li><a href="/login">Login</a></li>
		</ul>
		<p class="navbar-text navbar-right">Welcome, guest</p>
		{% endif %}
	</div>
</nav>

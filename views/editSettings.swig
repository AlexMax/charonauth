{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{{ macros.usernav(user.username, 'settings') }}
<p>
	Updating your password or e-mail address requires entering your current
	password.
</p>
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<div class="form-group {% if errors.user.current_password %}has-error{% endif %}">
			<label class="control-label" for="current_password">Current Password</label>
			<input class="form-control" name="user[current_password]" id="current_password" type="password" value="{{ data.user.current_password }}">
			<span class="help-block">{{ errors.user.current_password }}</span>
		</div>
		<div class="form-group {% if errors.user.password %}has-error{% endif %}">
			<label class="control-label" for="password">New Password</label>
			<input class="form-control" name="user[password]" id="password" type="password" value="{{ data.user.password }}">
			<span class="help-block">{{ errors.user.password }}</span>
		</div>
		<div class="form-group {% if errors.user.confirm %}has-error{% endif %}">
			<label class="control-label" for="confirm">Confirm New Password</label>
			<input class="form-control" name="user[confirm]" id="confirm" type="password" value="{{ data.user.confirm }}">
			<span class="help-block">{{ errors.user.confirm }}</span>
		</div>
		<div class="form-group {% if errors.user.email %}has-error{% endif %}">
			<label class="control-label" for="email">New E-Mail</label>
			<input class="form-control" name="user[email]" id="email" value="{{ data.user.email }}">
			<span class="help-block">{{ errors.user.email }}</span>
		</div>
		<button class="btn btn-primary" type="submit">Save</button>
	</fieldset>
</form>
{% endblock %}

{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}

{% set access_names = {
	'UNVERIFIED': "Unverified",
	'USER': "User",
	'OP': "Operator",
	'MASTER': "Master",
	'OWNER': "Owner"
} %}

{% if success %}
{{ macros.alert('success', 'Settings updated successfully!') }}
{% endif %}
{{ macros.usernav(user.username, 'settings') }}
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<div class="checkbox">
			<label>
				<input name="user[active]" type="checkbox" {% if data.user.active %}checked{% endif %}>Active
			</label>
		</div>
		<div class="form-group {% if errors.user.username %}has-error{% endif %}">
			<label class="control-label" for="username">Username</label>
			<input class="form-control" name="user[username]" id="username" value="{{ data.user.username }}">
			<span class="help-block">{{ errors.user.username }}</span>
		</div>
		<div class="form-group {% if errors.user.password %}has-error{% endif %}">
			<label class="control-label" for="password">Password</label>
			<input class="form-control" name="user[password]" id="password" type="password" value="{{ data.user.password }}">
			<span class="help-block">{{ errors.user.password }}</span>
		</div>
		<div class="form-group {% if errors.user.email %}has-error{% endif %}">
			<label class="control-label" for="email">E-Mail</label>
			<input class="form-control" name="user[email]" id="email" value="{{ data.user.email }}">
			<span class="help-block">{{ errors.user.email }}</span>
		</div>
		<div class="form-group {% if errors.user.access %}has-error{% endif %}">
			<label class="control-label" for="access">Access</label>
			<select class="form-control" name="user[access]" id="access">
				{% for access in accesses %}
				{% if data.user.access === access %}
				<option value="{{ access }}" selected>{{ access_names[access] }}</option>
				{% else %}
				<option value="{{ access }}">{{ access_names[access] }}</option>
				{% endif %}
				{% endfor %}
			</select>
			<span class="help-block">{{ errors.user.access }}</span>
		</div>
		<button class="btn btn-primary" type="submit">Save</button>
	</fieldset>
</form>
{% endblock %}

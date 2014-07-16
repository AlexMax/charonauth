{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{% if errors.form %}
{{ macros.alert('danger', 'Login failed') }}
{% endif %}
<h2>Login</h2>
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<div class="form-group {% if errors.login %}has-error{% endif %}">
			<label class="control-label" for="login">Username/Email</label>
			<input class="form-control" name="login" id="login" value="{{ data.login }}">
			<span class="help-block">{{ errors.login }}</span>
		</div>
		<div class="form-group {% if errors.password %}has-error{% endif %}">
			<label class="control-label" for="password">Password</label>
			<input class="form-control" type="password" name="password" id="password" value="{{ data.password }}">
			<span class="help-block">{{ errors.password }}</span>
		</div>
		<button class="btn btn-primary" type="submit">Sign In</button>
	</fieldset>
</form>
<a href="/reset">I forgot my password!</a>
{% endblock %}

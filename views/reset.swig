{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{% if success %}
{{ macros.alert('success', 'A password reset e-mail has been sent!') }}
{% endif %}
<h2>Reset Password</h2>
<p>Enter your e-mail address below:</p>
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<div class="form-group {% if errors.email %}has-error{% endif %}">
			<label class="control-label" for="email">E-Mail</label>
			<input class="form-control" name="email" id="email" value="{{ data.email }}">
			<span class="help-block">{{ errors.email }}</span>
		</div>
		<button class="btn btn-primary" type="submit">Send</button>
	</fieldset>
</form>
{% endblock %}

{% extends 'layout.swig' %}

{% block body %}
<h2>Register an Account</h2>
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<div class="form-group {% if errors.username %}has-error{% endif %}">
			<label class="control-label" for="username">Username</label>
			<input class="form-control" name="username" id="username" value="{{ data.username }}">
			<span class="help-block">{{ errors.username }}</span>
		</div>
		<div class="form-group {% if errors.password %}has-error{% endif %}">
			<label class="control-label" for="password">Password</label>
			<input class="form-control" type="password" name="password" id="password" value="{{ data.password }}">
			<span class="help-block">{{ errors.password }}</span>
		</div>
		<div class="form-group {% if errors.confirm %}has-error{% endif %}">
			<label class="control-label" for="confirm">Confirm</label>
			<input class="form-control" type="password" name="confirm" id="confirm" value="{{ data.confirm }}">
			<span class="help-block">{{ errors.confirm }}</span>
		</div>
		<div class="form-group {% if errors.email %}has-error{% endif %}">
			<label class="control-label" for="email">E-Mail</label>
			<input class="form-control" name="email" id="email" value="{{ data.email }}">
			<span class="help-block">{{ errors.email }}</span>
		</div>
		{% if recaptcha_public_key %}
		<div class="form-group {% if errors.captcha %}has-error{% endif %}">
			<label class="control-label">CAPTCHA</label>
			<script type="text/javascript" src="http://www.google.com/recaptcha/api/challenge?k={{ recaptcha_public_key }}"></script>
			<noscript>
				<iframe src="http://www.google.com/recaptcha/api/noscript?k={{ recaptcha_public_key }}" height="300" width="500" frameborder="0"></iframe><br>
				<textarea name="recaptcha_challenge_field" rows="3" cols="40"></textarea>
				<input type="hidden" name="recaptcha_response_field" value="manual_challenge">
			</noscript>
			<span class="help-block">{{ errors.captcha }}</span>
		</div>
		{% endif %}
		{% if verify %}
		<button class="btn btn-primary" type="submit">Next Step</button>
		{% else %}
		<button class="btn btn-primary" type="submit">Register</button>
		{% endif %}
	</fieldset>
</form>
{% endblock %}

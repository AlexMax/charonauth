{% extends 'layout.swig' %}

{% block body %}
<h2>Reset Password</h2>
<p>Enter your new password:</p>
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
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
		<button class="btn btn-primary" type="submit">Save</button>
	</fieldset>
</form>
{% endblock %}

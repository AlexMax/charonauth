{% extends 'layout.swig' %}

{% block body %}

{% set gravatars = [
	{"value": "", "name": "My Gravatar"},
	{"value": "identicon", "name": "Identicon"},
	{"value": "monsterid", "name": "MonsterID"},
	{"value": "wavatar", "name": "WAvatar"},
	{"value": "retro", "name": "Retro"}
] %}

<h2>Edit User</h2>
<a id="profile"></a>
<h3>Profile Data</h3>
<form method="post" role="form" action="#profile">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<input type="hidden" name="form" value="profile">
		<div class="form-group {% if errors.profile.gravatar %}has-error{% endif %}">
			<label class="control-label" for="gravatar">Gravatar Style</label>
			<select class="form-control" name="profile[gravatar]" id="gravatar">
				{% for gravatar in gravatars %}
				{% if data.profile.gravatar === gravatar.value %}
				<option value="{{ gravatar.value }}" selected>{{ gravatar.name }}</option>
				{% else %}
				<option value="{{ gravatar.value }}">{{ gravatar.name }}</option>
				{% endif %}
				{% endfor %}
			</select>
			<span class="help-block">{{ errors.profile.gravatar }}</span>
		</div>
		<div class="form-group {% if errors.profile.username %}has-error{% endif %}">
			<label class="control-label" for="username">Username</label>
			<input class="form-control" name="profile[username]" id="username" value="{{ data.profile.username }}">
			<span class="help-block">{{ errors.profile.username }}</span>
		</div>
		<div class="form-group {% if errors.profile.clan %}has-error{% endif %}">
			<label class="control-label" for="clan">Clan</label>
			<input class="form-control" name="profile[clan]" id="clan" value="{{ data.profile.clan }}">
			<span class="help-block">{{ errors.profile.clan }}</span>
		</div>
		<div class="form-group {% if errors.profile.clantag %}has-error{% endif %}">
			<label class="control-label" for="clantag">Clan Tag</label>
			<input class="form-control" name="profile[clantag]" id="clantag" value="{{ data.profile.clantag }}">
			<span class="help-block">{{ errors.profile.clantag }}</span>
		</div>
		<div class="form-group {% if errors.profile.country %}has-error{% endif %}">
			<label class="control-label" for="country">Country</label>
			<select class="form-control" name="profile[country]" id="country">
				<option value="">No Country Selected</option>
				{% for country in countries %}
				{% if data.profile.country === country.cca2 %}
				<option value="{{ country.cca2 }}" selected>{{ country.name }}</option>
				{% else %}
				<option value="{{ country.cca2 }}">{{ country.name }}</option>
				{% endif %}
				{% endfor %}
			</select>
			<span class="help-block">{{ errors.profile.country }}</span>
		</div>
		<div class="form-group {% if errors.profile.location %}has-error{% endif %}">
			<label class="control-label" for="location">Location</label>
			<input class="form-control" name="profile[location]" id="location" value="{{ data.profile.location }}">
			<span class="help-block">{{ errors.profile.location }}</span>
		</div>
		<div class="form-group {% if errors.profile.contactinfo %}has-error{% endif %}">
			<label class="control-label" for="contactinfo">Contact Information</label>
			<textarea class="form-control" name="profile[contactinfo]" id="contactinfo">{{ data.profile.contactinfo }}</textarea>
			<span class="help-block">{{ errors.profile.contactinfo }}</span>
		</div>
		<div class="form-group {% if errors.profile.message %}has-error{% endif %}">
			<label class="control-label" for="message">Message</label>
			<textarea class="form-control" name="profile[message]" id="message">{{ data.profile.message }}</textarea>
			<span class="help-block">{{ errors.profile.message }}</span>
		</div>
		<button class="btn btn-primary" type="submit">Save</button>
	</fieldset>
</form>
<a id="user"></a>
<h3>User Data</h3>
<p>
	Updating your password or e-mail address requires entering your current
	password.
</p>
<form method="post" role="form" action="#user">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<input type="hidden" name="form" value="user">
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

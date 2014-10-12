{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}

{% set gravatars = [
	{"value": "", "name": "My Gravatar"},
	{"value": "identicon", "name": "Identicon"},
	{"value": "monsterid", "name": "MonsterID"},
	{"value": "wavatar", "name": "WAvatar"},
	{"value": "retro", "name": "Retro"}
] %}

{% if success %}
{{ macros.alert('success', 'Profile updated successfully!') }}
{% endif %}
{{ macros.usernav(user.username, 'edit', true) }}
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<div class="checkbox">
			<label>
				<input name="profile[visible]" type="checkbox" {% if data.profile.visible %}checked{% endif %}>Profile is visible to public
			</label>
		</div>
		<div class="checkbox">
			<label>
				<input name="profile[visible_lastseen]" type="checkbox" {% if data.profile.visible_lastseen %}checked{% endif %}>"Last Played" is visible to public
			</label>
		</div>
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
				<option value="{{ country.cca2 }}" selected>{{ country.name.common }}</option>
				{% else %}
				<option value="{{ country.cca2 }}">{{ country.name.common }}</option>
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
{% endblock %}

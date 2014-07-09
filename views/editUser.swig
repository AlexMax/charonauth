{% extends 'layout.swig' %}

{% block body %}

{% set gravatars = {
	"": "My Gravatar",
	"identicon": "Identicon",
	"monsterid": "MonsterID",
	"wavatar": "WAvatar",
	"retro": "Retro"
} %}

<h2>Edit User</h2>
<form method="post" role="form">
	<fieldset>
		<input type="hidden" name="_csrf" value="{{ data._csrf }}">
		<div class="form-group {% if errors.profile.gravatar %}has-error{% endif %}">
			<label class="control-label" for="gravatar">Gravatar Style</label>
			<select class="form-control" name="profile[gravatar]" id="gravatar">
				{% for value, name in gravatars %}
				{% if data.profile.gravatar === value %}
				<option value="{{ value }}" selected>{{ name }}</option>
				{% else %}
				<option value="{{ value }}">{{ name }}</option>
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
				<option>No Country</option>
				<option>United States</option>
				<option>Commieland</option>
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

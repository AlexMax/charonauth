{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}

{% set access = {
	'USER': "User",
	'OP': "Operator",
	'MASTER': "Master",
	'OWNER': "Owner"
} %}

{{ macros.usernav(user.username, 'view', can_administer) }}
<h1>
	{{ user.profile.clantag }}{{ user.profile.username }}
</h1>
<div class="row">
	<div class="col-md-2">
		<img style="width:100%;max-width:150px" src="{{ macros.gravatar(user.getGravatar(), user.profile.gravatar, 'monsterid') }}" alt="{{ user.profile.username }}">
		<dl>
			<dt>Access</dt>
			<dd>{{ access[user.access] }}</dd>
			{% if user.profile.clan %}
			<dt>Clan</dt>
			<dd>{{ user.profile.clan }}</dd>
			{% endif %}
			{% if user.profile.country %}
			<dt>Country</dt>
			<dd>{{ user.profile.getCountry() }}</dd>
			{% endif %}
			{% if user.profile.location %}
			<dt>Location</dt>
			<dd>{{ user.profile.location }}</dd>
			{% endif %}
		</dl>
	</div>
	<div class="col-md-10">
		{% if user.profile.message or user.profile.contactinfo %}
		{% if user.profile.message %}
		<h4>Message</h4>
		<p>{{ user.profile.message }}</p>
		{% endif %}
		{% if user.profile.contactinfo %}
		<h4>Contact Info</h4>
		<p>{{ user.profile.contactinfo }}</p>
		{% endif %}
		{% else %}
		<p>User has no Message or Contact Info</p>
		{% endif %}
	</div>
</div>
{% endblock %}

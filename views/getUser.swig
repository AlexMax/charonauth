{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}

{% set access = {
	'USER': "User",
	'OP': "Operator",
	'MASTER': "Master",
	'OWNER': "Owner"
} %}

{{ macros.usernav(user.username, 'view', tabs) }}
<h1>
	{{ user.Profile.clantag }}{{ user.Profile.username }}
</h1>
<div class="row">
	<div class="col-sm-3">
		<img style="width:100%;max-width:150px" src="{{ macros.gravatar(user.getGravatar(), user.Profile.gravatar, 'monsterid') }}" alt="{{ user.Profile.username }}">
		<dl>
			<dt>Username</dt>
			<dd>{{ user.username }}</dd>
			<dt>Access</dt>
			<dd>{{ access[user.access] }}</dd>
			{% if user.Profile.clan %}
			<dt>Clan</dt>
			<dd>{{ user.Profile.clan }}</dd>
			{% endif %}
			{% if user.Profile.country %}
			<dt>Country</dt>
			<dd>{{ user.Profile.getCountry() }}</dd>
			{% endif %}
			{% if user.Profile.location %}
			<dt>Location</dt>
			<dd>{{ user.Profile.location }}</dd>
			{% endif %}
			{% if lastplayed %}
			<dt>Last Played</dt>
			<dd>{{ lastplayed|date('F j, Y') }}</dd>
			{% endif %}
		</dl>
	</div>
	<div class="col-sm-9">
		{% if user.Profile.message or user.Profile.contactinfo %}
		{% if user.Profile.message %}
		<h4>Message</h4>
		<p>{{ user.Profile.message }}</p>
		{% endif %}
		{% if user.Profile.contactinfo %}
		<h4>Contact Info</h4>
		<p>{{ user.Profile.contactinfo }}</p>
		{% endif %}
		{% else %}
		<p>User has no Message or Contact Info</p>
		{% endif %}
	</div>
</div>
{% endblock %}

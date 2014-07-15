{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{{ macros.usernav(user.username, 'view') }}
<h2>{{ user.profile.clantag }}{{ user.profile.username }}</h2>
<img src="{{ macros.gravatar(user.getGravatar(), user.profile.gravatar, 'identicon') }}" alt="{{ user.profile.username }}">
<dl>
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
	{% if user.profile.contactinfo %}
	<dt>Contact Info</dt>
	<dd>{{ user.profile.contactinfo }}</dd>
	{% endif %}
	{% if user.profile.message %}
	<dt>Message</dt>
	<dd>{{ user.profile.message }}</dd>
	{% endif %}
</dl>
{% endblock %}

{% extends 'layout.swig' %}

{% block body %}
<h2>{{ profile.clantag }}{{ profile.username }}</h2>
<img src="//www.gravatar.com/avatar/{{ user.getGravatar() }}">
<dl>
	{% if profile.clan %}
	<dt>Clan</dt>
	<dd>{{ profile.clan }}</dd>
	{% endif %}
	{% if profile.country %}
	<dt>Country</dt>
	<dd>{{ profile.country }}</dd>
	{% endif %}
	{% if profile.location %}
	<dt>Location</dt>
	<dd>{{ profile.location }}</dd>
	{% endif %}
	{% if profile.contactinfo %}
	<dt>Contact Info</dt>
	<dd>{{ profile.contactinfo }}</dd>
	{% endif %}
	{% if profile.message %}
	<dt>Message</dt>
	<dd>{{ profile.message }}</dd>
	{% endif %}
</dl>
{% if user.isOperator() or user.id === session.user.id %}
<a class="btn btn-primary" href="/users/{{ user.username }}/edit">Edit Profile</a>
{% endif %}
{% endblock %}

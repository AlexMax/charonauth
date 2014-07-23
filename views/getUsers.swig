{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
{% set operator = {'OWNER': true, 'MASTER': true, 'OP': true} %}
{% if session.user.access in operator %}
<ul class="nav nav-tabs" role="tablist">
	<li class="{% if f == 'active' %}active{% endif %}">
		<a href="/users?f=active">Active</a>
	</li>
	<li class="{% if f == 'unverified' %}active{% endif %}">
		<a href="/users?f=unverified">Unverified</a>
	</li>
	<li class="{% if f == 'inactive' %}active{% endif %}">
		<a href="/users?f=inactive">Inactive</a>
	</li>
</ul>
{% endif %}

<h2>User Directory</h2>
{% if users %}
<table class="table">
	<thead>
		<tr>
			<th>Country</th>
			<th>Gravatar</th>
			<th>Username</th>
			<th>Clan</th>
			<th>Last Seen</th>
	</thead>
	<tbody>
		{% for user in users %}
		<tr>
			<td><img height="80" src="/assets/svg/{{ user.profile.getFlag() }}.svg" alt="{{ user.profile.getCountry() }}"></td>
			<td><img src="{{ macros.gravatar(user.getGravatar(), user.profile.gravatar, 'monsterid') }}" alt="{{ user.profile.username }}"></td>
			<td><a href="/users/{{ user.username }}">{{ user.profile.clantag }}{{ user.profile.username }}</a></td>
			<td>{{ user.profile.clan }}</td>
			<td>{{ user.seen }}</td>
		</tr>
		{% endfor %}
	</tbody>
</table>
{% else %}
<p>No users found.</p>
{% endif %}
{% endblock %}

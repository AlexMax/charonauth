{% import './macros.swig' as macros %}
{% extends 'layout.swig' %}

{% block body %}
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

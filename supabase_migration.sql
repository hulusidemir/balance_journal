-- Create a table for user settings
create table user_settings (
  user_id uuid references auth.users not null primary key,
  bybit_api_key text,
  bybit_api_secret text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table user_settings enable row level security;

-- Create policies
create policy "Users can view their own settings"
  on user_settings for select
  using ( auth.uid() = user_id );

create policy "Users can insert their own settings"
  on user_settings for insert
  with check ( auth.uid() = user_id );

create policy "Users can update their own settings"
  on user_settings for update
  using ( auth.uid() = user_id );
